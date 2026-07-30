let airJumpUsed = false

KeyBindEvents.pressed('double_jump', event => {
    let p = event.player
    let onGround = p.nbt.getBoolean('OnGround')

    console.log('[Client] SPACE pressed, onGround=' + onGround +
        ' motionY=' + p.motionY + ' airJumpUsed=' + airJumpUsed)

    if (onGround) return

    if (airJumpUsed) return

    console.log('[Client] DOUBLE JUMP! addMotion')
    p.addMotion(0, 1.0, 0)
    airJumpUsed = true

    setTimeout(() => {
        airJumpUsed = false
    }, 500)
})
