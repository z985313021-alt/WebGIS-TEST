# WebSocket 实时通信协议

## 概述

客户端通过 WebSocket 与服务器建立全双工连接，实现订单通知、私聊消息等实时推送功能。

- **连接地址**: `ws://<host>/ws?token=<bearer_token>`
- **认证方式**: URL query 参数携带 Bearer token
- **心跳间隔**: 60 秒（服务器 ping → 客户端 pong）
- **断线重连**: 客户端 5 秒后自动重连

---

## 连接握手

### 客户端发起
```
GET /ws?token=xxx HTTP/1.1
Upgrade: websocket
```

### 服务器响应
成功:
```json
{ "type": "connected", "user": { "id": 1, "username": "admin", "role": "admin" }, "ts": 1789700000000 }
```

失败（token 无效）:
```json
{ "type": "error", "msg": "未授权，请重新登录" }
// 随后服务器关闭连接（code 4001）
```

---

## 事件类型

所有事件格式统一为:
```json
{ "type": "<event_type>", "data": { ... }, "ts": 1789700000000 }
```

### 订单通知（管理员接收）

| type | 触发时机 | data |
|---|---|---|
| `order:created` | 用户下单 | `{ orderNo, total, buyer }` |
| `order:paid` | 用户付款 | `{ orderNo, total, buyer }` |
| `order:cancelled` | 用户取消 | `{ orderNo, buyer }` |
| `order:done` | 用户确认收货 | `{ orderNo, total, buyer }` |

### 发货通知（用户接收）

| type | 触发时机 | data |
|---|---|---|
| `order:shipped` | 管理员发货 | `{ orderNo, trackingNo }` |

### 私聊消息（收发双方）

| type | 方向 | data |
|---|---|---|
| `message:private` | 发送方 → 接收方 | `{ id, from, to, content, fromName, ts }` |

> 注意：发送方**不会**收到自己发出的消息（不会给自己标未读）。

---

## 服务器 API

### 用户在线状态
```
GET /api/ws/stats
→ { ok, total, admins, users, redis }
```

### 私聊消息
```
POST /api/messages              { toUserId, content }  → 发送消息
GET  /api/messages/:userId                              → 获取对话记录
GET  /api/messages/unread                               → 未读统计 [{from_user_id, cnt}]
POST /api/messages/read/:fromUserId                     → 标记已读
GET  /api/users/online                                  → 在线用户列表
```

### 验证码（登录页）
```
GET /api/auth/captcha → { ok, id, svg }
```

---

## 客户端实现

### 连接管理 (`src/composables/useWebSocket.js`)

```js
// 自动连接（有 token 时）
if (localStorage.getItem('webgis_token')) connect();

// 订阅事件
onEvent('order:created', (msg) => { ... });
onEvent('message:private', (msg) => { ... });
onEvent('*', (type, data) => { ... });  // 通配所有事件
```

### 事件分发机制

```
WebSocket 收到消息
  → window.dispatchEvent(new CustomEvent('ws-event', { detail: msg }))
  → 各组件通过 onEvent() 监听到事件
  → 更新 Vue 响应式数据 → UI 自动刷新
```

### 心跳与重连

```
断线 → ws.onclose 触发 → 5 秒后 reconnect()
服务器每 60s ping → 客户端自动 pong
超时无 pong → 服务器 terminate 连接
```

---

## 服务器连接注册表

```
userConns: Map<userId, Set<WebSocket>>  // 一个用户可能多端登录
adminConns: Set<WebSocket>               // 管理员连接（用于广播通知）
```

### 推送函数

```js
notifyAdmins(type, data)   // 广播给所有在线管理员
notifyUser(userId, type, data)  // 推送给指定用户
```

---

## 安全考虑

1. **token 认证**: 握手时校验，无效立即断开（4001）
2. **HttpOnly Cookie**: 登录标记使用 httpOnly cookie（防 XSS）
3. **CORS**: 同源策略 + nginx 代理（不直接暴露后端端口）
4. **限流**: 全局限流 600次/分钟 + 写接口单独限流

---

## 故障排查

| 现象 | 可能原因 | 排查 |
|---|---|---|
| 连接失败 4001 | token 无效/过期 | 检查 localStorage token |
| 收不到事件 | listeners 未注册 | 检查 onEvent 是否在 onMounted 中调用 |
| 未读角标不更新 | loadUnread 未触发 | 检查控制台 [chat] 警告 |
| 消息不同步 | msg.data 解析错误 | 检查 data.from vs data.data.from |
```
