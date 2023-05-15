'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('activity', 'context_blob', Sequelize.JSONB)
  },

  async down(queryInterface /*, Sequelize*/) {
    await queryInterface.removeColumn('activity', 'context_blob')
  },
}
