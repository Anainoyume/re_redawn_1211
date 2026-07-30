ServerEvents.recipes(event => {
    event.custom({
        type: 'extendedcrafting:shaped_table',
        pattern: [
            'AAAAA',
            'A    ',
            'AAAAA',
            'A    ',
            'A    '
        ],
        key: {
            A: { item: 'minecraft:gold_ingot' }
        },
        result: {
            id: 'minecraft:diamond'
        }
    })
})

ItemEvents.rightClicked('minecraft:diamond_sword', event => {
    event.player.openChestGUI(Text.of('钻石提取器'), 1, gui => {
        gui.playerSlots = true
        
        let shouldGive = false
        gui.slot(4, 0, slot => {
            slot.setItem('minecraft:diamond')
            slot.setLeftClicked(e => {
                e.slot.gui.player.give('minecraft:diamond')
                e.slot.setItem(Item.of('minecraft:air'))  // ← ItemStack.EMPTY → Item.of('minecraft:air')
                e.setHandled()
            })
        })
        
        gui.closed = () => {
            if (shouldGive) {
                setTimeout(() => {
                    event.player.give('minecraft:diamond')
                }, 60)
            }
        }
    })
})