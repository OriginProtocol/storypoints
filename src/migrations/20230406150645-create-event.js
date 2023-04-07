'use strict'
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Events', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      points: {
        type: Sequelize.INTEGER
      },
      currency: {
        type: Sequelize.STRING
      },
      price: {
        type: Sequelize.FLOAT
      },
      type: {
        type: Sequelize.STRING
      },
      contractAddress: {
        type: Sequelize.STRING
      },
      walletAddress: {
        type: Sequelize.STRING
      },
      eventHash: {
        type: Sequelize.STRING
      },
      timestamp: {
        type: Sequelize.DATE
      },
      ognStakedMultiplier: {
        type: Sequelize.FLOAT
      },
      collectionVolumeMultiplier: {
        type: Sequelize.FLOAT
      },
      moderationMultiplier: {
        type: Sequelize.FLOAT
      },
      description: {
        type: Sequelize.STRING
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    })

    await queryInterface.addConstraint('Events', {
      fields: ['eventHash'],
      type: 'unique',
      name: 'unique_eventHash'
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('Events')

    await queryInterface.removeConstraint('Events', 'unique_eventHash')
  }
}
