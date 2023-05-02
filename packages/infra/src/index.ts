import path from 'path'
import {
  aws_elasticbeanstalk as elasticbeanstalk,
  aws_rds as rds,
  aws_s3 as s3,
  App,
  CfnOutput,
  DockerImage,
  Duration,
  RemovalPolicy,
  Stack,
  StackProps,
} from 'aws-cdk-lib'
import {
  InstanceClass,
  InstanceSize,
  InstanceType,
  IpAddresses,
  Peer,
  Port,
  PrivateSubnet,
  SecurityGroup,
  SubnetType,
  Vpc,
} from 'aws-cdk-lib/aws-ec2'
import {
  CfnInstanceProfile,
  Effect,
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam'
import { Runtime } from 'aws-cdk-lib/aws-lambda'
import {
  Certificate,
  CertificateValidation,
} from 'aws-cdk-lib/aws-certificatemanager'
import { DatabaseInstance } from 'aws-cdk-lib/aws-rds'
import { Asset } from 'aws-cdk-lib/aws-s3-assets'
import { Queue } from 'aws-cdk-lib/aws-sqs'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { Secret } from 'aws-cdk-lib/aws-secretsmanager'
import {
  AwsCustomResource,
  AwsCustomResourcePolicy,
  PhysicalResourceId,
  Provider,
} from 'aws-cdk-lib/custom-resources'

import ApiBundler from './apiBundler'

interface StoryPointsProps extends StackProps {
  domainName: string
  enableTestRules?: boolean
  instanceType?: string
  removalPolicy?: RemovalPolicy
}

// Both within the default subnet of the default VPC
const PRIVATE_SUBNET_CIDRS = ['172.31.128.0/24', '172.31.138.0/24']

export class StoryPoints extends Stack {
  constructor(scope: App, id: string, props: StoryPointsProps) {
    super(scope, id, props)
    const { region } = Stack.of(this)
    const { domainName, enableTestRules, instanceType, removalPolicy } = props
    const context = scope.node.tryGetContext(id) as {
      configSecretsArn: string
      vpc: string
    }
    const { configSecretsArn, vpc: vpcId } = context
    const appName = `storypoints-${id}`
    const vpc = vpcId
      ? Vpc.fromLookup(this, 'VPC', { vpcId })
      : new Vpc(this, 'LocalVPC', {
          ipAddresses: IpAddresses.cidr('172.31.0.0/16'),
        })
    const secrets = Secret.fromSecretCompleteArn(
      this,
      'ConfigSecrets',
      configSecretsArn,
    )
    const reservoirApiKey = secrets
      .secretValueFromJson('reservoirApiKey')
      .unsafeUnwrap()
    const jsonRpcProviderUrl = secrets
      .secretValueFromJson('jsonRpcProviderUrl')
      .unsafeUnwrap()
    const apiKey = secrets.secretValueFromJson('apiKey').unsafeUnwrap()

    const privateSubnets = []
    if (!vpc.privateSubnets.length) {
      const p0 = new PrivateSubnet(this, `${appName}-private0`, {
        availabilityZone: this.availabilityZones[0],
        cidrBlock: PRIVATE_SUBNET_CIDRS[0],
        vpcId: vpc.vpcId,
      })
      const p1 = new PrivateSubnet(this, `${appName}-private1`, {
        availabilityZone: this.availabilityZones[1],
        cidrBlock: PRIVATE_SUBNET_CIDRS[1],
        vpcId: vpc.vpcId,
      })
      privateSubnets.push(p0)
      privateSubnets.push(p1)
    }

    const ebApplication = new elasticbeanstalk.CfnApplication(this, appName, {
      applicationName: appName,
    })

    const migrationRole = new Role(this, `${appName}-migration-role`, {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    })

    const webtierRole = new Role(this, `${appName}-webteir-role`, {
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
    })

    webtierRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkWebTier'),
    )
    webtierRole.addToPolicy(
      new PolicyStatement({
        resources: ['*'],
        actions: ['cloudwatch:PutMetricData'],
      }),
    )

    const ec2InstanceProfile = new CfnInstanceProfile(
      this,
      `${appName}-profile`,
      {
        instanceProfileName: `${appName}-profile`,
        roles: [webtierRole.roleName],
      },
    )

    const webSg = new SecurityGroup(this, `${appName}-web-sg`, {
      vpc: vpc,
      description: 'Security Group for the Load Balancer',
      securityGroupName: `${appName}-web-sg`,
    })
    webSg.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(80),
      `Allow incoming traffic over port 80`,
    )
    webSg.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(443),
      `Allow incoming traffic over port 443`,
    )

    const dbSg = new SecurityGroup(this, `${appName}-db-sg`, {
      vpc: vpc,
      description: 'Security Group for the RDS instance',
      securityGroupName: `${appName}-db-sg`,
    })
    dbSg.addIngressRule(
      Peer.securityGroupId(webSg.securityGroupId),
      Port.tcp(5432),
      `Allow Web instances to connect`,
    )

    const rdsCredsSecret = new Secret(this, `${appName}-db-creds`, {
      generateSecretString: {
        excludePunctuation: true,
        secretStringTemplate: JSON.stringify({ username: 'storypoints' }),
        generateStringKey: 'password',
      },
    })
    const db = new DatabaseInstance(this, `${appName}-db`, {
      databaseName: 'storypoints',
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_2,
      }),
      instanceType: InstanceType.of(
        InstanceClass.BURSTABLE3,
        InstanceSize.SMALL,
      ),
      credentials: {
        username: 'storypoints',
        password: rdsCredsSecret.secretValueFromJson('password'),
      },
      publiclyAccessible: true,
      removalPolicy,
      securityGroups: [dbSg],
      vpc,
      vpcSubnets: {
        subnets: privateSubnets.length ? privateSubnets : vpc.privateSubnets,
      },
    })
    new CfnOutput(this, 'dbEndpoint', {
      value: db.dbInstanceEndpointAddress,
    })

    const nodeJsFunctionProps = {
      bundling: {
        target: 'node16',
        externalModules: [],
        nodeModules: ['pg', 'pg-hstore'],
        minify: true,
        esbuildArgs: {
          '--keep-names': 'true', // Needed because of https://github.com/node-fetch/node-fetch/issues/784#issuecomment-1014768204
          '--tsconfig': path.resolve(__dirname, '..', 'tsconfig.json'),
        },
      },
      runtime: Runtime.NODEJS_16_X,
      timeout: Duration.seconds(300),
      memorySize: 1024,
      environment: {
        POSTGRES_HOST: db.dbInstanceEndpointAddress,
        POSTGRES_PORT: db.dbInstanceEndpointPort,
        POSTGRES_SSL: 'true',
        POSTGRES_PASSWORD: rdsCredsSecret
          .secretValueFromJson('password')
          .unsafeUnwrap(),
      },
      securityGroups: [webSg],
    }

    const workerQueue = new Queue(this, 'Worker', {
      removalPolicy,
      fifo: true,
      contentBasedDeduplication: true,
      visibilityTimeout: Duration.seconds(300),
    })
    workerQueue.grantSendMessages(webtierRole)
    workerQueue.grantConsumeMessages(webtierRole)

    const migrationHandler = new NodejsFunction(this, 'migrate', {
      ...nodeJsFunctionProps,
      bundling: {
        ...nodeJsFunctionProps.bundling,
        nodeModules: ['pg', 'pg-hstore'],
      },
      vpc,
    })
    migrationRole.addToPolicy(
      new PolicyStatement({
        resources: [migrationHandler.functionArn],
        actions: ['lambda:InvokeFunction'],
      }),
    )
    const migrationProvider = new Provider(this, 'MigrationProvider', {
      onEventHandler: migrationHandler,
      //isCompleteHandler: isComplete, // optional async "waiter"
      //logRetention: logs.RetentionDays.ONE_DAY, // default is INFINITE
      role: migrationRole,
    })
    migrationProvider.node.addDependency(db)
    migrationProvider.node.addDependency(migrationHandler)
    const migrationResource = new AwsCustomResource(this, 'MigrationResource', {
      // will also be called for a CREATE event
      onUpdate: {
        action: 'invoke',
        service: 'Lambda',
        parameters: {
          FunctionName: migrationHandler.functionName,
          Payload: JSON.stringify({
            params: {
              eventName: 'update',
            },
          }),
        },
        // Run every time this stack is deployed
        physicalResourceId: PhysicalResourceId.of((+new Date()).toString()),
      },
      policy: AwsCustomResourcePolicy.fromStatements([
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['lambda:InvokeFunction'],
          resources: ['*'], // TODO
        }),
      ]),
      timeout: Duration.seconds(120),
    })
    migrationResource.node.addDependency(db)
    migrationResource.node.addDependency(migrationProvider)
    new CfnOutput(this, 'MigrationResourcePayload', {
      value: migrationResource.getResponseField('Payload'),
    })

    const appPath = path.join(__dirname, '..', '..', 'api')
    const bucket = new s3.Bucket(this, `${appName}-bucket`, {
      autoDeleteObjects: true,
      bucketName: appName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy,
    })
    bucket.grantRead(webtierRole)

    const appBundle = new Asset(this, 'StoryPointsApp', {
      path: appPath,
      bundling: {
        // TODO: compute asset hash with local deps so this rolls on all changes
        //assetHash: TODO
        local: new ApiBundler(appPath, 'node16.17'),
        // Docker image seems to be required but unused with local defined?
        image: DockerImage.fromRegistry('alpine'),
      },
    })
    appBundle.bucket.grantRead(webtierRole)
    new CfnOutput(this, 'EC2InstallAssetBucket', {
      value: appBundle.bucket.bucketName,
    })

    // if this was a known zone
    let zone
    /*const zone = new route53.HostedZone(this, 'HostedZone', {
      zoneName: 'example.com',
    });*/

    // TODO: This is setup for a DNS zone outside of this account/env. Should
    // add the option to use a known zone for validation to keep this package
    // usable by others.
    const cert = new Certificate(this, `${appName}-certificate`, {
      domainName,
      validation: CertificateValidation.fromDns(zone),
    })

    const appVersion = new elasticbeanstalk.CfnApplicationVersion(
      this,
      `${appName}-version`,
      {
        applicationName: appName,
        sourceBundle: {
          s3Bucket: appBundle.s3BucketName,
          s3Key: appBundle.s3ObjectKey,
        },
      },
    )

    const ebSubnets = vpc
      .selectSubnets({ subnetType: SubnetType.PUBLIC })
      .subnets.map((s) => s.subnetId)
      .join(',')

    const commonSettings = [
      {
        namespace: 'aws:autoscaling:launchconfiguration',
        optionName: 'InstanceType',
        value: instanceType ?? 't3.medium',
      },
      {
        namespace: 'aws:autoscaling:launchconfiguration',
        optionName: 'IamInstanceProfile',
        value: ec2InstanceProfile.attrArn,
      },
      {
        namespace: 'aws:autoscaling:launchconfiguration',
        optionName: 'SecurityGroups',
        value: webSg.securityGroupId,
      },
      {
        namespace: 'aws:ec2:vpc',
        optionName: 'VPCId',
        value: vpc.vpcId,
      },
      {
        namespace: 'aws:ec2:vpc',
        optionName: 'Subnets',
        value: ebSubnets,
      },
      {
        namespace: 'aws:elasticbeanstalk:cloudwatch:logs',
        optionName: 'StreamLogs',
        value: 'true',
      },
      {
        namespace: 'aws:elasticbeanstalk:cloudwatch:logs',
        optionName: 'RetentionInDays',
        value: '30',
      },
      {
        namespace: 'aws:elasticbeanstalk:application:environment',
        optionName: 'APP_NAME',
        value: appName,
      },
      {
        namespace: 'aws:elasticbeanstalk:application:environment',
        optionName: 'AWS_REGION',
        value: region,
      },
      {
        namespace: 'aws:elasticbeanstalk:application:environment',
        optionName: 'POSTGRES_HOST',
        value: db.dbInstanceEndpointAddress,
      },
      {
        namespace: 'aws:elasticbeanstalk:application:environment',
        optionName: 'POSTGRES_PORT',
        value: db.dbInstanceEndpointPort,
      },
      {
        namespace: 'aws:elasticbeanstalk:application:environment',
        optionName: 'POSTGRES_SSL',
        value: 'true',
      },
      {
        namespace: 'aws:elasticbeanstalk:application:environment',
        optionName: 'POSTGRES_PASSWORD',
        value: rdsCredsSecret.secretValueFromJson('password').unsafeUnwrap(),
      },
      {
        namespace: 'aws:elasticbeanstalk:application:environment',
        optionName: 'RESERVOIR_API_KEY',
        value: reservoirApiKey,
      },
      {
        namespace: 'aws:elasticbeanstalk:application:environment',
        optionName: 'JSON_PRC_PROVIDER',
        value: jsonRpcProviderUrl,
      },
      {
        namespace: 'aws:elasticbeanstalk:application:environment',
        optionName: 'ENABLE_TEST_RULES',
        value: enableTestRules ? 'true' : 'false',
      },
    ]
    const webSettings = [
      {
        namespace: 'aws:ec2:vpc',
        optionName: 'ELBSubnets',
        value: ebSubnets,
      },
      {
        namespace: 'aws:elb:listener:443',
        optionName: 'ListenerEnabled',
        value: 'true',
      },
      {
        namespace: 'aws:elb:listener:443',
        optionName: 'ListenerProtocol',
        value: 'HTTPS',
      },
      {
        namespace: 'aws:elb:listener:443',
        optionName: 'InstancePort',
        value: '80',
      },
      {
        namespace: 'aws:elb:listener:443',
        optionName: 'InstanceProtocol',
        value: 'HTTP',
      },
      {
        namespace: 'aws:elb:listener:443',
        optionName: 'SSLCertificateId',
        value: cert.certificateArn,
      },
      {
        namespace: 'aws:elasticbeanstalk:application:environment',
        optionName: 'WORKER_QUEUE_URL',
        value: workerQueue.queueUrl,
      },
      {
        namespace: 'aws:elasticbeanstalk:application:environment',
        optionName: 'API_KEY',
        value: apiKey,
      },
    ]
    const workerSettings = [
      {
        namespace: 'aws:elasticbeanstalk:sqsd',
        optionName: 'WorkerQueueURL',
        value: workerQueue.queueUrl,
      },
      {
        namespace: 'aws:elasticbeanstalk:application:environment',
        optionName: 'IS_WORKER',
        value: 'true',
      },
    ]

    const ebEnv = new elasticbeanstalk.CfnEnvironment(
      this,
      `${appName}-web-env`,
      {
        environmentName: `${appName}-web-env`,
        applicationName: appName,
        solutionStackName: '64bit Amazon Linux 2 v5.8.0 running Node.js 16',
        versionLabel: appVersion.ref,
        optionSettings: commonSettings.concat(webSettings),
      },
    )

    new elasticbeanstalk.CfnEnvironment(this, `${appName}-worker-env`, {
      environmentName: `${appName}-worker-env`,
      applicationName: appName,
      tier: {
        name: 'Worker',
        type: 'SQS/HTTP',
      },
      solutionStackName: '64bit Amazon Linux 2 v5.8.0 running Node.js 16',
      versionLabel: appVersion.ref,
      optionSettings: commonSettings.concat(workerSettings),
    })

    new CfnOutput(this, 'ElasticBeanstalkEndpoint', {
      value: ebEnv.attrEndpointUrl,
    })

    appVersion.addDependency(ebApplication)
    appVersion.node.addDependency(ebApplication)
    appVersion.node.addDependency(appBundle)
    ebEnv.addDependency(ebApplication)
    ebEnv.addDependency(appVersion)
  }
}

const app = new App()

/* TODO
new StoryPoints(app, 'prod', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,,
    region: 'us-east-2',
  },
  removalPolicy: RemovalPolicy.DESTROY,
})*/
new StoryPoints(app, 'sandbox', {
  domainName: 'sandbox.ogn-review.net', // TODO: make this a CDK param?
  enableTestRules: false,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-2',
  },
  removalPolicy: RemovalPolicy.DESTROY,
})

app.synth()
