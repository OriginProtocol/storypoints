'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('collection', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      disabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      contractAddress: {
        type: Sequelize.BLOB,
        field: 'contract_address',
      },
      description: {
        type: Sequelize.STRING,
      },
    })

    await queryInterface.addConstraint('collection', {
      fields: ['contract_address'],
      type: 'unique',
      name: 'unique_contract_address',
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint(
      'collection',
      'unique_contract_address'
    )
    await queryInterface.dropTable('collection')
  },
}
