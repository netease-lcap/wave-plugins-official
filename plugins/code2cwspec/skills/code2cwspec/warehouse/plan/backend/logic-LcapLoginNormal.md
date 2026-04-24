# 权限中心-普通用户登录（LcapLoginNormal）

## 普通用户登录（LcapLoginNormal）

### 功能概述

普通用户登录服务端逻辑负责处理系统用户的身份认证过程，验证用户提供的用户名和密码是否有效，并根据验证结果返回相应的登录状态。该逻辑通过查询用户表，匹配用户名和用户来源（普通登录），验证用户账户状态，确保只有正常状态的用户才能成功登录。**密码校验必须使用** `nasl.auth.validatePassword(plainText, hashedText)`（内置加解密逻辑），**禁止**使用明文对比（如 `passWord == loginUser.password`）。登录成功后调用 `extensions.lcap_auth.logics.createToken(sessionUser)` 创建 Token 并建立会话，为后续的权限控制和业务操作提供身份基础。

### 功能要点

- **用户身份验证**：系统接收用户输入的用户名和密码，首先验证这两个参数是否为空，然后在用户表中查找匹配的用户记录。查询时会同时验证用户名和用户来源（必须为普通登录来源），确保用户身份的合法性。如果找到匹配的用户记录，系统会进一步验证用户账户状态，只有状态为"正常"的用户才能继续登录流程。

- **密码安全校验**：**必须使用** `nasl.auth.validatePassword(plainText, hashedText)` 进行密码校验，该方法内置了加解密逻辑，会自动处理密码的哈希比对。**禁止**使用简单对比密码明文是否一致的方式。密码在数据库中通常以哈希形式存储，直接对比明文会导致校验失败。如果密码验证失败，系统返回"账号或密码错误"等提示。

- **会话管理与响应**：登录成功后，系统会更新用户的更新时间，并调用 `extensions.lcap_auth.logics.createToken(sessionUser)` 创建用户会话令牌。返回值为内联对象类型 `{ code: Integer, msg: String }`，便于前端根据 code、msg 处理。登录失败时根据不同情况返回相应错误码和提示信息，如"账号或密码错误"、"用户已被禁用"等。

### 逻辑签名

```naturalts path="app.logics.LcapLoginNormal.ts"
$Logic({
    description: '普通用户登录',
    directory: 'permission_center(权限中心)'
})
export declare function LcapLoginNormal(userName: String, passWord: String): { code: Integer, msg: String };
```

### 被前端调用

- **登录页（login）**：用户在登录页面输入用户名和密码后，点击"登 录"按钮，系统会调用 LcapLoginNormal 服务端逻辑进行身份验证，传入参数为 userName 与 passWord。根据返回的 code 和 msg 字段，系统判断登录是否成功，成功则跳转到系统主页，失败则显示相应的错误提示信息。

### 依赖的枚举、实体、数据结构

- **数据建模-枚举-用户状态**：[数据建模-枚举](plan/data-model/enums.md)
- **数据建模-枚举-用户来源**：[数据建模-枚举](plan/data-model/enums.md)
- **数据建模-实体-用户**：[权限中心-实体-用户（LcapUser）](plan/data-model/entity-LcapUser.md)
<!-- PENDING -->
