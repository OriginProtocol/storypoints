'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('activity', 'adjustment_multiplier', {
      type: Sequelize.FLOAT,
      defaultValue: 1,
    })
  },

  async down(queryInterface /*, Sequelize*/) {
    await queryInterface.removeColumn('activity', 'adjustment_multiplier')
  },
}
