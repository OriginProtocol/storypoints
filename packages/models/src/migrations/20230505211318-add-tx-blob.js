'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('activity', 'transaction_blob', {
      type: Sequelize.JSONB,
    })
  },

  async down(queryInterface /*, Sequelize*/) {
    await queryInterface.removeColumn('activity', 'transaction_blob')
  },
}
