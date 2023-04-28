'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('wallet', {
      address: {
        type: Sequelize.BLOB,
        field: 'address',
        primaryKey: true,
      },
      ens_name: {
        type: Sequelize.STRING,
      },
      ogn_stake: {
        type: Sequelize.STRING,
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
  },

  async down(queryInterface /*, Sequelize*/) {
    await queryInterface.dropTable('wallet')
  },
}
