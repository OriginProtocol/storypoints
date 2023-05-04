// nonce: 1
// Lambda handler for running DB migrations
import { migrate /*undo*/ } from '@storypoints/models'

export async function handler({ params }: { params: { eventName: string } }) {
  const { eventName } = params

  await (
    {
      create: async () => {
        await migrate()
      },
      update: async () => {
        await migrate()
      },
      /* Can't confirm the behavior of this so leaving it out for now
      delete: async () => {
        await undo()
      },*/
    } as Record<string, () => Promise<void>>
  )[eventName]()
  return { PhysicalResourceId: (+new Date()).toString() }
}
