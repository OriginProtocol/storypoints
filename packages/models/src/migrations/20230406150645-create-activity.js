'use strict'
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('activity', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      valid: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      points: {
        type: Sequelize.INTEGER,
      },
      currency: {
        type: Sequelize.BLOB,
      },
      price: {
        type: Sequelize.DECIMAL,
      },
      priceUSD: {
        type: Sequelize.FLOAT,
        field: 'price_usd',
      },
      type: {
        type: Sequelize.STRING,
      },
      contractAddress: {
        type: Sequelize.BLOB,
        field: 'contract_address',
      },
      walletAddress: {
        type: Sequelize.BLOB,
        field: 'wallet_address',
      },
      activityHash: {
        type: Sequelize.BLOB,
        field: 'activity_hash',
      },
      timestamp: {
        type: Sequelize.DATE,
      },
      multiplier: {
        type: Sequelize.FLOAT,
        field: 'multiplier',
      },
      description: {
        type: Sequelize.STRING,
      },
      activityBlob: {
        type: Sequelize.JSONB,
        field: 'activity_blob',
      },
      orderBlob: {
        type: Sequelize.JSONB,
        field: 'order_blob',
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        field: 'created_at',
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        field: 'updated_at',
      },
    })

    await queryInterface.addConstraint('activity', {
      fields: ['activity_hash'],
      type: 'unique',
      name: 'unique_activity_hash',
    })
  },
  async down(queryInterface) {
    await queryInterface.removeConstraint('activity', 'unique_activity_hash')
    await queryInterface.dropTable('activity')
  },
}
