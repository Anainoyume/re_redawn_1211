# KubeJS 开发上下文参考

> 基于本次会话的实际踩坑经验总结。**写任何代码前先查证 API 是否存在。**

## 核心原则

1. **永远先查 Wiki + 源码确认 API**，不凭经验猜测
   - 官方 Wiki：https://kubejs.com/wiki/
   - DeepWiki（源码自动文档）：https://deepwiki.com/kube-mods/kubejs
   - 源码：https://github.com/kube-mods/kubejs
   - Wiki 源码（markdown）：https://github.com/kube-mods/wiki
2. **API 存在性**以 `@RemapForJS` 注解 + `BuiltinKubeJSPlugin.registerBindings()` 中的注册为准
3. **客户端 vs 服务端**是两套不同的对象和权限模型，不可混用

---

## 客户端 vs 服务端关键区别

| | 客户端 | 服务端 |
|---|---|---|
| 玩家类型 | `LocalPlayer` | `ServerPlayer` |
| 位置权威 | **客户端控制** | 服务端跟随客户端包 |
| 速度修改 | `addMotion` 生效 | `addMotion`/`setMotion` **会被客户端包覆盖，无效** |
| 按键检测 | `KeyBindEvents.pressed` 可用 | 无直接按键检测 |
| 脚本目录 | `client_scripts/` | `server_scripts/` |
| 重载方式 | `F3 + T` | `/reload` 或 `/kubejs reload server-scripts` |
| 配方注册 | ❌ 不可 | `ServerEvents.recipes` |
| 内容注册 | ❌ 不可 | ❌ 不可（需 `startup_scripts/`） |

> **规则**：需要修改玩家速度/位置 → 客户端做。需要配方/数据 → 服务端做。需要注册内容 → startup 做。

---

## 事件 API 速查

### ItemEvents 组

| 事件名 | 脚本目录 | 目标？ | 备注 |
|---|---|---|---|
| `ItemEvents.modifyTooltips` | `client_scripts` | 否 | **不是** `tooltips` 或 `tooltip` |
| `ItemEvents.dynamicTooltips` | `client_scripts` | 是（字符串ID） | 需先在 `modifyTooltips` 中 `tooltip.dynamic('id')` |
| `ItemEvents.rightClicked` | `server_scripts` | 是（物品ID） | `ItemEvents.rightClicked('minecraft:diamond_sword', event => {...})` |
| `ItemEvents.modification` | `startup_scripts` | 否 | 修改物品组件 |
| `ItemEvents.crafted` | `server_scripts` | 是 | |
| `ItemEvents.dropped` | `server_scripts` | 是 | 可取消 |
| `ItemEvents.canPickUp` | `server_scripts` | 是 | 可取消 |
| `ItemEvents.foodEaten` | `server_scripts` | 是 | 可取消 |

### ServerEvents 组

| `ServerEvents.recipes` | `server_scripts` | 否 | 配方增删改，需 `/reload` |
| `ServerEvents.tags` | `server_scripts` | 否 | 标签修改 |
| `ServerEvents.loaded` | `server_scripts` | 否 | 服务器启动完成 |
| `ServerEvents.tick` | `server_scripts` | 否 | 每个 server tick |

### PlayerEvents 组

| `PlayerEvents.tick` | `server_scripts` | 否 | `event.player` 是 ServerPlayer |
| `PlayerEvents.loggedIn` | `server_scripts` | 否 | |
| `PlayerEvents.loggedOut` | `server_scripts` | 否 | |

### NetworkEvents 组

| `NetworkEvents.dataReceived` | `server_scripts` | 是（channel字符串） | **event.entity** 不是 event.player！ |

### KeyBindEvents 组（仅客户端）

| `KeyBindEvents.registry` | `startup_scripts` | 否 | 注册按键，需重启游戏生效 |
| `KeyBindEvents.pressed` | `client_scripts` | 是（按键ID） | 按下触发 |
| `KeyBindEvents.released` | `client_scripts` | 是 | 松开触发 |
| `KeyBindEvents.tick` | `client_scripts` | 是 | 按住每 tick 触发 |

---

## 配方注册 (`ServerEvents.recipes`)

### 通用自定义配方（其他 mod 的机器配方）
```js
ServerEvents.recipes(event => {
    event.custom({
        type: 'modid:recipe_type',
        // 纯 JSON 对象，匹配 datapack 配方格式
        // 不要用 Ingredient.of().toJson()！
    })
})
```
- `event.custom()` 传的是纯 JSON 对象，**不是** KubeJS API 包装
- Farmer's Delight 示例用的是 `{ item: 'minecraft:cake' }`，不是 `Ingredient.of().toJson()`
- 需要 `/reload` 才能生效（不是 `/kubejs reload server-scripts`）

### 普通配方
```js
event.shaped(output, pattern[], {key: item})
event.shapeless(output, [items])
event.smithing(output, template, base, addition)  // 1.20+
event.smelting(output, input)
event.stonecutting(output, input)
```

---

## 按键绑定

### 注册（startup_scripts，需重启）
```js
KeyBindEvents.registry(event => {
    event.register('my_key', 'KEY_SPACE').inGame()
})
```

- **GLFW 键名**：`'KEY_SPACE'` 不是 `'SPACE'`，`'KEY_P'` 不是 `'P'`
- 格式：GLFW 常量去 `GLFW_` 前缀
- `.inGame()` 限制仅在游戏中响应

### 监听（client_scripts）
```js
KeyBindEvents.pressed('my_key', event => {
    let p = event.player  // LocalPlayer
})
```

---

## 自定义箱子 GUI

```js
event.player.openChestGUI(Text.of('标题'), rows, gui => {
    gui.playerSlots = true  // 显示玩家背包（会触发 inventory capture）
    gui.slot(x, y, slot => {
        slot.setItem('minecraft:diamond')
        slot.setLeftClicked(e => {
            e.slot.gui.player.give('minecraft:diamond')
            e.slot.setItem(Item.of('minecraft:air'))
            e.setHandled()
        })
    })
    gui.closed = () => {
        setTimeout(() => {
            event.player.give('minecraft:diamond')
        }, 60)  // 延迟给物品，避开 inventory restore
    }
})
```

**重要限制**：
- 格子**不是容器**，`mayPickup()` 硬编码 `false`，**不能拖拽拿取**
- 格子是按钮式交互，必须用 `setLeftClicked/setRightClicked` 回调
- `e.slot.gui.player` 获取玩家（`ChestMenuClickEvent` 没有 `player` 字段！）
- `ItemStack.EMPTY` 不是 KubeJS 全局绑定 → 用 `Item.of('minecraft:air')`
- `playerSlots = true` 打开 GUI 会清空真实背包，关闭后下一 tick 恢复，期间 `give` 的物品会被 restore 覆盖

---

## 文件 I/O

| API | 用途 | 限制 |
|---|---|---|
| `JsonIO.read(path)` | 读 JSON 为 JS 对象 | 路径相对游戏根目录，不能越界 |
| `JsonIO.readString(path)` | 读为字符串 | |
| `JsonIO.write(path, json)` | 写 JSON | 创建父目录，null 则删除 |
| `NBTIO.read(path)` | 读 NBT 文件 | |
| `NBTIO.write(path, nbt)` | 写 NBT 文件 | |

- **不能写纯文本**（无 `writeString` API）
- **不能读/写任意格式**
- 静态 datapack 文件（mcfunction 等）放 `kubejs/data/` 目录

---

## ClassFilter 沙箱限制

`kubejs.classfilter.txt` 中禁止的包：
- `- java.io` → `File`, `FileWriter` 等不可用
- `- java.nio` → `Files.writeString` 等不可用
- `- java.lang` (前缀) → `System`, `Runtime`, `ProcessBuilder`, `Thread` 不可用
- `- java.net` → `URL`, `HttpURLConnection` 不可用

**只精确允许**：`String`, `Integer`, `Runnable`, `StringBuilder`, `Object` 等 ~20 个。

**无**：外部进程调用、HTTP 外发、纯文本写入。

---

## 全局绑定速查

来自 `BuiltinKubeJSPlugin.java:403-482` 和 `BuiltinKubeJSClientPlugin.java:31-44`：

**文件 I/O**：`JsonIO`, `NBTIO`

**物品/方块**：`Item`, `Items`, `Block`, `Blocks`, `Ingredient`, `Fluid`, `Fluids`

**文本**：`Text`, `Component`, `TextIcons`

**工具**：`console`, `Java`, `Utils`, `StringUtils`, `UUID`, `NBT`

**数学**：`KMath`, `JavaMath`

**客户端专属**（懒加载）：`Client`, `GLFWInput`

**不存在**：`ItemStack`（用 `Item.of()` 代替），`File`, `Files`, `Path`

---

## 玩家属性速查

| 属性/方法 | 类型 | 说明 |
|---|---|---|
| `player.motionY` | get/set | 垂直速度（来自 `EntityKJS`） |
| `player.motionX` / `player.motionZ` | get/set | 水平速度 |
| `player.setMotion(x, y, z)` | 方法 | `setDeltaMovement`，**不设 hasImpulse** |
| `player.addMotion(x, y, z)` | 方法 | `push`，**设 hasImpulse=true** |
| `player.nbt` | get | `CompoundTag`，可读 `OnGround` |
| `player.nbt.getBoolean('OnGround')` | 方法 | 判断是否在地面 |
| `player.persistentData` | get | 持久化 NBT 存储 |
| `player.give('item_id')` | 方法 | 给予物品 |
| `player.name` | get | 玩家显示名（`Component`） |
| `player.isOnGround()` | ❌ | **不存在**于 KubeJS API |
| `player.isInWater()` | ❌ | **不存在** |

---

## 调试技巧

- `console.log()` 输出到 `.minecraft/logs/latest.log`
- `/kubejs errors server` / `/kubejs errors client` 查看脚本错误
- `/kubejs hand` 复制手中物品 ID 和 NBT
- `F3 + H` 开启高级物品提示
- `F3 + T` 重载客户端资源（包括 `client_scripts`）

---

## 文件结构

```
kubejs/
├── startup_scripts/    ← 注册内容（方块/物品/按键），需重启
├── server_scripts/     ← 配方/标签/服务端逻辑，/reload
├── client_scripts/     ← 工具提示/按键响应/客户端逻辑，F3+T
├── assets/             ← 虚拟资源包
├── data/               ← 虚拟数据包（配方 JSON/mcfunction 等）
├── config/             ← KubeJS 配置文件
└── exported/           ← 导出目录
```

---

## 本会话中踩过的坑

1. `ItemEvents.tooltips` → 正确的是 `ItemEvents.modifyTooltips`
2. `ItemStack.EMPTY` → 不存在，用 `Item.of('minecraft:air')`
3. `event.player` in `NetworkKubeEvent` → 正确的是 `event.entity`
4. `'SPACE'` → GLFW 键名是 `'KEY_SPACE'`
5. `player.isOnGround()` → 不存在，用 `player.nbt.getBoolean('OnGround')`
6. 服务端改 ServerPlayer 速度 → 被客户端包覆盖，无效。改速度必须在客户端
7. `Ingredient.of().toJson()` in `event.custom()` → 不需要，传纯 JSON 对象
8. `/kubejs reload server-scripts` 配方不生效 → 配方需要 `/reload`
9. CustomChestMenu 格子不能拖拽拿取 → 是按钮，不是容器
10. `playerSlots = true` + `give` → 物品被 restore 覆盖，需延迟给
