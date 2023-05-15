'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      'activity',
      'reservoir_order_id',
      Sequelize.BLOB
    )
  },

  async down(queryInterface /*, Sequelize*/) {
    await queryInterface.removeColumn('activity', 'reservoir_order_id')
  },
}
