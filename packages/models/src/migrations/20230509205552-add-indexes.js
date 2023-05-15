'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Activity indexing
    await queryInterface.addIndex('activity', ['valid'], {
      name: 'activity__valid',
    })
    await queryInterface.addIndex('activity', ['type'], {
      name: 'activity__type',
    })
    await queryInterface.addIndex('activity', ['contract_address'], {
      name: 'activity__contract_address',
    })
    await queryInterface.addIndex('activity', ['wallet_address'], {
      name: 'activity__wallet_address',
    })
    await queryInterface.addIndex('activity', ['timestamp'], {
      name: 'activity__timestamp',
    })
    await queryInterface.addIndex('activity', ['points'], {
      name: 'activity__points',
    })
    await queryInterface.addIndex('activity', ['reservoir_order_id'], {
      name: 'activity__reservoir_order_id',
    })

    // Collection
    await queryInterface.addIndex('collection', ['contract_address'], {
      name: 'collection__contract_address',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      'collection',
      'collection__contract_address'
    )

    await queryInterface.removeIndex('activity', 'activity__reservoir_order_id')
    await queryInterface.removeIndex('activity', 'activity__points')
    await queryInterface.removeIndex('activity', 'activity__timestamp')
    await queryInterface.removeIndex('activity', 'activity__wallet_address')
    await queryInterface.removeIndex('activity', 'activity__contract_address')
    await queryInterface.removeIndex('activity', 'activity__type')
    await queryInterface.removeIndex('activity', 'activity__valid')
  },
}
