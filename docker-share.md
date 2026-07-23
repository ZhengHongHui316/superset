# Docker 容器技术入门与实践（Java / Spring Boot 版）

> 部门内部技术分享 · 2026-07-07

---

## 目录

1. [核心概念](#1-核心概念)
2. [Dockerfile 详解与编写](#2-dockerfile-详解与编写)
3. [常用 Docker 命令](#3-常用-docker-命令)
4. [Docker Compose 多容器编排](#4-docker-compose-多容器编排)
5. [总结](#5-总结)

---

## 1. 核心概念

### 1.1 Docker 是什么？

Docker 是一个**开源的容器化平台**，它让开发者可以将应用及其所有依赖（JDK、Maven/Gradle 构建产物、配置文件、运行环境等）打包到一个标准化的单元中，这个单元就是**容器（Container）**。

Java 开发者的常见痛点：
- 本地用 JDK 11，服务器上是 JDK 8 —— 启动就报 `UnsupportedClassVersionError`
- 新同事拉代码后"在我的机器上能跑"—— 缺依赖、缺配置、环境不一致
- 部署时还要手动传 war/jar、配 Tomcat、改 Nginx……

Docker 解决了这些问题：**一次构建，到处运行**。你构建的镜像里已经包含了 JDK 和所有依赖，在任何装了 Docker 的机器上都能以完全相同的方式启动。

---

### 1.2 镜像（Image）

> 镜像 = 应用的**只读模板**，类似于安装系统的 ISO 或虚拟机快照。

- 镜像是一个**静态的文件集合**，里面包含了运行应用所需的一切：JAR 包、JDK、环境变量、启动命令等。
- 镜像本身**不可修改、不可运行**，它只是用来生成容器的"蓝图"。
- 镜像可以分层叠加（见下文 1.4 分层）。
- 镜像通常从 **基础镜像（Base Image）** 开始构建，比如 `eclipse-temurin:17-jre`、`openjdk:17-jdk-slim`。

常用镜像获取方式：

```bash
# 从 Docker Hub 拉取
docker pull eclipse-temurin:17-jre

# 查看本地已有镜像
docker images
```

---

### 1.3 容器（Container）

> 容器 = 镜像的**运行实例**，类似于一个 JVM 进程。

- 容器是镜像运行时的一个**动态实例**。
- 每个容器都是**隔离的**：拥有独立的文件系统、网络、进程空间。
- 容器是**有生命周期**的：可以启动、停止、删除。
- 容器本质是宿主机上的一个**进程**（加上 namespace/cgroup 隔离），比虚拟机更轻量。

简单类比：

| 概念 | 类比 | 说明 |
|------|------|------|
| 镜像 | 类（Class） | 定义模板，不可运行 |
| 容器 | 对象（Instance） | 运行起来的实例 |
| Dockerfile | 配方 | 定义如何制作镜像 |
| Volume | U盘 | 持久化存储数据 |

---

### 1.4 分层（Layer）

> Docker 镜像由多个只读层（Layer）叠加而成，每一层代表 Dockerfile 中的一条指令。

这是 Docker 最核心的机制之一。

```
[Layer 4] CMD ["java", "-jar", "app.jar"]          ← 运行命令
[Layer 3] COPY target/app.jar /app/                 ← 复制产物
[Layer 2] COPY src/main/resources/application.yml   ← 复制配置
[Layer 1] FROM eclipse-temurin:17-jre               ← 基础镜像（含 JDK）
```

**分层带来的好处：**

- **缓存加速**：如果某一层没有变化，构建时直接使用缓存。比如你只改了 Java 代码，但 `pom.xml` 没变，Maven 依赖那层就会被缓存，构建速度显著提升。
- **镜像共享**：多个镜像可以复用相同的基础层（比如都基于 `eclipse-temurin:17-jre`），节省磁盘空间和网络带宽。
- **最小化镜像**：每多一层就多一份存储，合理设计 Dockerfile 可以减少层数和镜像体积。

**注意**：容器在镜像层之上还会叠加一个**可写层（Writable Layer）**。容器内文件的修改都写在这一层，不会影响底层镜像。这也是为什么容器是"轻量"和"可丢弃"的——删掉容器，可写层就没了。

> 如果有修改需要持久化，就需要使用 **Volume**。

---

### 1.5 卷（Volume）

> 卷 = 容器外部的持久化存储，生命周期独立于容器。

当容器删除时，容器内部的文件系统（可写层）会随之丢失。如果我们需要**持久化数据**（如数据库文件、上传的文件、日志、配置等），就需要使用 Volume。

**为什么需要 Volume？**

```
容器 A（MySQL）              容器 B（Spring Boot 应用）
┌─────────────────┐          ┌──────────────┐
│ 可写层（临时）   │          │ 可写层（临时） │
│ /var/lib/mysql  │ ←—— 数据丢失！—— │ /app/logs    │
│ （容器删了，数据没了） │          │ （容器删了，日志没了）│
└─────────────────┘          └──────────────┘

使用 Volume 后：
┌─────────────────┐          ┌──────────────┐
│ 可写层（临时）   │          │ 可写层（临时） │
│ /var/lib/mysql  │ ←—— 挂载点 ——→│  Volume      │
│                 │          │ /app/logs    │
└─────────────────┘          └──────────────┘
容器删了，Volume 还在，数据不丢。
```

**Volume 的特点：**

- 生命周期**独立于容器**：容器删了，Volume 还在。
- Docker 托管，不受宿主机文件系统权限影响。
- 可以在多个容器之间**共享**数据。
- 支持**备份和迁移**。

**常见使用场景：**

- 数据库数据目录（如 MySQL 的 `/var/lib/mysql`）
- 应用上传的文件
- 应用的配置和日志目录
- 外部配置文件（如 `application-prod.yml` 挂载到容器内）

**绑定挂载（Bind Mount）** 是另一种数据持久化方式，它直接将宿主机的目录映射到容器内。适合开发时热加载代码，但生产环境通常推荐使用 Volume。

---

## 2. Dockerfile 详解与编写

### 2.1 什么是 Dockerfile？

Dockerfile 是一个文本文件，包含了一系列**构建指令**，用来定义一个 Docker 镜像的构建过程。

> Dockerfile 就像一份"食谱"，`docker build` 命令就是照着这份食谱"烹饪"出镜像。

### 2.2 核心指令

| 指令 | 说明 | 示例 |
|------|------|------|
| `FROM` | 指定基础镜像（必须是第一行非注释） | `FROM eclipse-temurin:17-jre` |
| `WORKDIR` | 设置容器内的工作目录 | `WORKDIR /app` |
| `COPY` | 将宿主机文件复制到镜像中 | `COPY target/app.jar .` |
| `ADD` | 类似 COPY，但支持 URL 和自动解压 | `ADD https://... /app` |
| `RUN` | 在构建过程中执行命令（每条生成一层） | `RUN apt-get install -y curl` |
| `ENV` | 设置环境变量 | `ENV SPRING_PROFILES_ACTIVE=prod` |
| `EXPOSE` | 声明容器暴露的端口（文档用途） | `EXPOSE 8080` |
| `VOLUME` | 声明挂载点（创建匿名 Volume） | `VOLUME /app/logs` |
| `CMD` | 容器启动时的默认命令 | `CMD ["java", "-jar", "app.jar"]` |
| `ENTRYPOINT` | 容器的固定入口点 | `ENTRYPOINT ["docker-entrypoint.sh"]` |
| `ARG` | 构建参数（仅在构建时使用） | `ARG JAR_FILE=target/*.jar` |

---

### 2.3 实例讲解：Spring Boot 应用的 Dockerfile

下面是一个典型的 Spring Boot 项目 Dockerfile：

```dockerfile
# ============================================================
# 第 1 步：选择基础镜像
# ============================================================
# 使用 Eclipse Temurin 的 JRE 镜像（比完整 JDK 小很多）
FROM eclipse-temurin:17-jre

# 设置构建参数
ARG DEBIAN_FRONTEND=noninteractive

# ============================================================
# 第 2 步：安装运行时需要的系统工具
# ============================================================
# 很多 JRE 镜像不带 shell 工具，需要手动安装
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
        tzdata \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ↑ 注意：这一整条 RUN 命令只生成一层，
#   配合 && 和清理命令，可以减小镜像体积。

# ============================================================
# 第 3 步：设置工作目录
# ============================================================
WORKDIR /app

# ============================================================
# 第 4 步：添加应用用户（安全最佳实践）
# ============================================================
# 以 root 运行应用有安全风险，创建专用用户
RUN groupadd -r appuser && useradd -r -g appuser appuser

# ============================================================
# 第 5 步：复制构建产物（JAR 包）
# ============================================================
# 只复制打包好的 JAR，不需要复制整个源代码
COPY target/*.jar app.jar

# ============================================================
# 第 6 步：设置权限
# ============================================================
RUN chown -R appuser:appuser /app
USER appuser

# ============================================================
# 第 7 步：声明端口
# ============================================================
EXPOSE 8080

# ============================================================
# 第 8 步：设置启动命令
# ============================================================
ENTRYPOINT ["java", \
    "-Djava.security.egd=file:/dev/./urandom", \
    "-Dspring.profiles.active=${SPRING_PROFILES_ACTIVE:-prod}", \
    "-jar", "/app/app.jar"]
```

**各指令解释：**

| 指令 | 作用 |
|------|------|
| `FROM eclipse-temurin:17-jre` | 基于 Java 17 JRE 镜像，只包含运行环境，不包含编译工具，体积小 |
| `WORKDIR /app` | 容器内的工作目录，后续 COPY、RUN、CMD 都在这个目录下执行 |
| `COPY target/*.jar app.jar` | 把本地 Maven/Gradle 构建好的 JAR 包复制到镜像中 |
| `EXPOSE 8080` | 声明容器监听 8080 端口（仅文档作用，实际映射在运行时指定） |
| `ENTRYPOINT` | 容器启动时的固定命令，支持通过环境变量覆盖配置 |
| `-Dspring.profiles.active` | 读取环境变量 `SPRING_PROFILES_ACTIVE`，默认 `prod` |

### 2.4 构建镜像

```bash
# 先确保已经打包好 JAR
mvn clean package -DskipTests

# 构建镜像
docker build -t employee-service:1.0.0 .

# 查看构建结果
docker images
# REPOSITORY          TAG       IMAGE ID      SIZE
# employee-service    1.0.0     abc123def     280MB
```

### 2.5 Dockerfile 最佳实践

1. **利用分层缓存**：把不常变动的指令（如 COPY JAR）和常变动的分开。
   ```dockerfile
   # 不好的做法：每次都重新 COPY 整个 target 目录
   COPY . .
   RUN mvn package

   # 好的做法：先在 CI/CD 中构建好 JAR，Dockerfile 只 COPY 产物
   COPY target/app.jar app.jar
   ```

2. **选择合适的基础镜像**：
   - `eclipse-temurin:17-jre` —— 只有 JRE，体积最小（~200MB），生产推荐
   - `openjdk:17-jdk-slim` —— 包含 JDK，体积稍大（~400MB），开发方便
   - `eclipse-temurin:17-jdk` —— 完整 JDK，最大，不推荐生产使用

3. **合并 RUN 指令**：减少层数，同时清理缓存文件。
   ```dockerfile
   # 好的写法（一层 + 清理）
   RUN apt-get update && \
       apt-get install -y --no-install-recommends curl tzdata && \
       apt-get clean && \
       rm -rf /var/lib/apt/lists/*
   ```

4. **使用非 root 用户运行**（生产环境最佳实践）：
   ```dockerfile
   RUN groupadd -r appuser && useradd -r -g appuser appuser
   USER appuser
   ```

5. **JVM 内存参数**：Docker 中 JVM 需要特殊配置才能正确识别容器内存限制。
   ```bash
   # 方式一：使用容器感知的 JVM 参数
   java -XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -jar app.jar

   # 方式二：Spring Boot 2.3+ 已默认开启容器感知
   java -jar app.jar
   ```

---

## 3. 常用 Docker 命令

### 3.1 镜像管理

```bash
# 列出本地所有镜像
docker images

# 拉取远程镜像
docker pull eclipse-temurin:17-jre

# 删除镜像
docker rmi employee-service:1.0.0

# 查看镜像历史（每一条指令对应一层）
docker history employee-service:1.0.0
```

### 3.2 容器管理

```bash
# 启动容器（前台运行，会占用当前终端）
docker run -p 8080:8080 employee-service:1.0.0

# 后台运行（detached mode）
docker run -d -p 8080:8080 --name employee-app employee-service:1.0.0

# 参数说明：
#   -d           后台运行
#   -p 8080:8080 端口映射（宿主机:容器）
#   --name       指定容器名称
#   -v volume:/path  挂载 Volume
#   -e KEY=VAL   设置环境变量（如 -e SPRING_PROFILES_ACTIVE=prod）
#   --restart always  自动重启

# 查看正在运行的容器
docker ps

# 查看所有容器（包括已停止的）
docker ps -a

# 停止容器
docker stop employee-app

# 启动已停止的容器
docker start employee-app

# 重启容器
docker restart employee-app

# 删除容器（必须先停止）
docker rm employee-app

# 强制删除运行中的容器
docker rm -f employee-app
```

### 3.3 查看日志

```bash
# 实时查看容器日志（最常用的调试命令）
docker logs -f employee-app

# 查看最近 100 行日志
docker logs --tail 100 employee-app

# 查看最近 1 小时的日志
docker logs --since 1h employee-app

# 带时间戳
docker logs -f --timestamps employee-app
```

> `docker logs -f` 是排查线上问题的神器，几乎每天都会用到。`-f` 表示 follow，会持续输出新日志。

### 3.4 进入容器

```bash
# 在运行中的容器内执行命令（最常用）
docker exec -it employee-app bash

# 参数说明：
#   exec   在运行中的容器内执行命令
#   -i     保持 STDIN 打开（交互式输入）
#   -t     分配一个伪终端（让终端更好看）
#   bash   要执行的命令

# Java 开发常用的调试命令
docker exec employee-app cat /app/config/application-prod.yml   # 查看配置文件
docker exec employee-app ls -la /app/logs/                       # 查看日志文件
docker exec employee-app ps aux | grep java                      # 查看 JVM 进程
docker exec employee-app jstack 1 > thread-dump.txt              # 导出线程快照
docker exec employee-app jmap -histo 1 > heap-histogram.txt      # 查看堆内存对象
```

### 3.5 其他实用命令

```bash
# 查看容器资源使用情况（CPU、内存、网络）
docker stats

# 查看容器详细信息（IP、网络、挂载等）
docker inspect employee-app

# 复制文件：宿主机 ↔ 容器
docker cp employee-app:/app/logs/app.log ./app.log
docker cp ./application-prod.yml employee-app:/app/config/

# 查看容器内端口监听情况
docker exec employee-app netstat -tlnp

# 查看容器环境变量
docker exec employee-app env
```

---

## 4. Docker Compose 多容器编排

### 4.1 为什么需要 Docker Compose？

一个真实的应用通常不是单个容器就能搞定的。以我们最常见的 **Spring Boot + MySQL** 架构为例：

```
一个典型 Spring Boot 应用需要：
┌──────────────────┐    ┌──────────────────┐
│  Spring Boot 应用  │    │  MySQL 数据库     │
│  (employee-svc)  │    │  (mysql:8.0)     │
│  :8080           │    │  :3306           │
│  - 业务逻辑       │    │  - 数据持久化     │
│  - REST API      │    │  - 事务管理       │
└────────┬─────────┘    └────────┬─────────┘
         │                       │
         └───────────────────────┘
                  Docker Compose
              （统一管理，自动网络互通）
```

如果每个容器都手动 `docker run` 来启动，手动配网络、端口、依赖关系、启动顺序，会非常痛苦：

```bash
# 没有 Compose 的话，你需要手动做这些：
docker network create myapp-net                    # 1. 创建网络
docker run -d --name mysql -e MYSQL_ROOT_PASSWORD=123456 \
  -v mysql-data:/var/lib/mysql mysql:8.0           # 2. 启动 MySQL
docker run -d --name app --network myapp-net \
  -p 8080:8080 -e SPRING_DATASOURCE_URL=... \
  employee-service:1.0.0                           # 3. 启动应用（要手动连网络）
```

**Docker Compose 就是解决这个问题的工具**：用一个 YAML 文件定义所有服务，一条命令管理整个应用栈。

### 4.2 核心概念

| Compose 概念 | 对应 Docker 概念 | 说明 |
|-------------|-----------------|------|
| Service（服务） | 容器 | 一个应用组件，如 MySQL、Spring Boot 应用 |
| Image / Build | 镜像 | 指定镜像名或构建方式 |
| Ports | 端口映射 | 宿主机端口:容器端口 |
| Environment | 环境变量 | 传递给容器的 Spring 配置 |
| Volumes | 卷 | 数据持久化（MySQL 数据、应用日志） |
| Networks | 网络 | 服务间通信 |
| depends_on | 依赖关系 | 启动顺序控制 |
| healthcheck | 健康检查 | 判断服务是否就绪 |

### 4.3 实例讲解：Spring Boot + MySQL 的 Compose 配置

下面是一个典型的 `docker-compose.yml`：

```yaml
services:

  # ================================================================
  #  MySQL 数据库
  # ================================================================
  mysql:
    image: mysql:8.0.39               # 使用官方 MySQL 镜像
    container_name: employee-mysql
    restart: always

    environment:
      MYSQL_ROOT_PASSWORD: 123456
      MYSQL_DATABASE: employee_db
      MYSQL_CHARSET: utf8mb4
      MYSQL_COLLATION: utf8mb4_unicode_ci

    ports:
      - "3307:3306"                    # 宿主机3307 → 容器3306

    volumes:
      - mysql_data:/var/lib/mysql      # 持久化 MySQL 数据

    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p123456"]
      interval: 5s
      timeout: 10s
      retries: 10
      start_period: 30s

    networks:
      - app-net

  # ================================================================
  #  Spring Boot 应用
  # ================================================================
  app:
    image: employee-service:1.0.0      # 使用我们构建好的镜像

    container_name: employee-app
    restart: always

    ports:
      - "8080:8080"                    # 宿主机 8080 → 容器 8080

    environment:
      # Spring Boot 配置 —— 注意：这里的主机名是 mysql（服务名）！
      SPRING_DATASOURCE_URL: jdbc:mysql://mysql:3306/employee_db?charset=utf8mb4
      # ↑ Docker Compose 内置 DNS 会把服务名 mysql 解析为对应容器的 IP
      #   不用写 localhost，不用写 IP，直接用服务名即可。

      SPRING_DATASOURCE_USERNAME: root
      SPRING_DATASOURCE_PASSWORD: 123456
      SPRING_PROFILES_ACTIVE: prod
      JAVA_OPTS: "-Xmx512m -Xms256m"   # JVM 内存参数

    volumes:
      - app_logs:/app/logs             # 持久化应用日志

    depends_on:
      mysql:
        condition: service_healthy     # 等 MySQL 健康检查通过后再启动

    networks:
      - app-net

volumes:
  mysql_data:
    driver: local                      # MySQL 数据持久化
  app_logs:
    driver: local                      # 应用日志持久化

networks:
  app-net:
    driver: bridge                     # 自定义桥接网络
```

**关键点逐段解释：**

#### MySQL 服务

```yaml
mysql:
  image: mysql:8.0.39               # 使用 Docker Hub 官方镜像
  container_name: employee-mysql
  restart: always                    # 容器退出后自动重启（生产必备）

  environment:                       # MySQL 初始化配置
    MYSQL_ROOT_PASSWORD: 123456      #  root 密码
    MYSQL_DATABASE: employee_db      # 自动创建的数据库

  ports:
    - "3307:3306"                     # 宿主机 3307 → 容器内 3306
                                      # 映射到 3307 是为了避免和本地 MySQL 冲突

  volumes:
    - mysql_data:/var/lib/mysql       # 持久化数据，容器删了数据还在

  healthcheck:                       # 健康检查
    test: ["CMD", "mysqladmin", "ping", ...]
    interval: 5s                      # 每 5 秒检查一次
    start_period: 30s                 # 启动后等 30 秒再开始检查（MySQL 初始化需要时间）
```

#### Spring Boot 应用服务

```yaml
app:
  image: employee-service:1.0.0      # 引用本地已有的镜像

  ports:
    - "8080:8080"                     # 宿主机 8080 → 容器内 8080

  environment:
    SPRING_DATASOURCE_URL: jdbc:mysql://mysql:3306/employee_db
    # ↑ 关键：这里的主机名是 mysql，不是 localhost！
    #   Docker Compose 内置 DNS 会自动把服务名解析为对应容器的 IP。
    #   这是 Compose 最重要的特性之一 —— 服务发现。

    SPRING_PROFILES_ACTIVE: prod      # 激活 prod 配置
    JAVA_OPTS: "-Xmx512m -Xms256m"    # JVM 堆内存配置

  volumes:
    - app_logs:/app/logs              # 把容器内日志目录持久化到 Volume

  depends_on:
    mysql:
      condition: service_healthy      # 等 MySQL 完全就绪后才启动应用
```

#### Volume 声明

```yaml
volumes:
  mysql_data:
    driver: local                     # MySQL 数据存在 Docker 管理的目录
  app_logs:
    driver: local                     # 应用日志持久化
```

#### Network 声明

```yaml
networks:
  app-net:
    driver: bridge                    # 桥接网络，所有服务互通
```

### 4.4 Docker Compose 常用命令

```bash
# ============================================================
# 启动服务
# ============================================================

# 后台启动所有服务（首次部署）
docker compose up -d

# 启动并自动构建镜像（修改代码后重新部署）
docker compose up -d --build

# 只启动某个服务
docker compose up -d mysql

# ============================================================
# 查看状态
# ============================================================

# 查看运行状态
docker compose ps

# 查看所有服务日志
docker compose logs

# 实时跟踪日志（等同于逐个 docker logs -f）
docker compose logs -f

# 只看某个服务的日志
docker compose logs -f app

# ============================================================
# 执行一次性命令
# ============================================================

# 在 app 容器内执行命令（等同于 docker exec）
docker compose exec app curl http://localhost:8080/actuator/health

# 执行 Flyway/Liquibase 迁移（如果需要）
docker compose exec app java -jar app.jar --spring.profiles.active=migrate

# ============================================================
# 停止和清理
# ============================================================

# 停止服务（保留数据、保留 Volume）
docker compose down

# 停止服务并删除所有 Volume（⚠️ 数据会丢失！）
docker compose down -v

# 重启服务
docker compose restart

# ============================================================
# 重新构建
# ============================================================

# 重建所有服务
docker compose up -d --build

# 只重建某个服务
docker compose up -d --build app
```

### 4.5 完整部署流程示例

以 Spring Boot + MySQL 项目为例的完整部署流程：

```bash
# ─── 方式 A：开发机构建，传输到服务器 ──────────────────────────

# 1. 本地 Maven 打包
mvn clean package -DskipTests

# 2. 构建 Docker 镜像
docker build -t employee-service:1.0.0 .

# 3. 打包成 tar 文件（用于传输）
docker save -o employee-service.tar employee-service:1.0.0

# 4. 上传 employee-service.tar 和 docker-compose.yml 到服务器

# 5. 服务器上加载镜像
docker load < employee-service.tar

# 6. 启动所有服务
docker compose up -d

# 7. 查看日志确认启动成功
docker compose logs -f

# 8. 访问 http://<服务器IP>:8080


# ─── 方式 B：服务器上直接 build ────────────────────────────────

# 1. 把源代码上传到服务器
# 2. 直接启动（Compose 会自动构建镜像）
docker compose up -d --build

# 3. 查看日志
docker compose logs -f
```

### 4.6 Compose 文件结构一览

```
docker-compose.yml
├── services              # 服务定义
│   ├── mysql            # MySQL 服务
│   │   ├── image        # 使用官方镜像
│   │   ├── ports        # 3307:3306
│   │   ├── environment  # 密码、数据库名
│   │   ├── volumes      # 数据持久化
│   │   ├── healthcheck  # 健康检查
│   │   └── networks     # app-net
│   │
│   └── app              # Spring Boot 应用服务
│       ├── image        # 本地构建的镜像
│       ├── ports        # 8080:8080
│       ├── environment  # Spring 配置、JVM 参数
│       ├── volumes      # 日志持久化
│       ├── depends_on   # 等待 MySQL 就绪
│       └── networks     # app-net
│
├── volumes              # 卷声明
│   ├── mysql_data       # MySQL 数据
│   └── app_logs         # 应用日志
│
└── networks             # 网络声明
    └── app-net          # 自定义桥接网络
```

---

## 5. 总结

### 核心概念回顾

| 概念 | 一句话 |
|------|--------|
| 镜像（Image） | 应用的只读模板，包含 JAR + JDK，不可运行 |
| 容器（Container） | 镜像的运行实例，就是一个带 JVM 的隔离进程 |
| Dockerfile | 定义如何构建镜像的"食谱" |
| 分层（Layer） | 镜像由多层叠加，指令 = 一层，利用缓存加速构建 |
| 卷（Volume） | 容器外部的持久化存储，容器删了数据还在 |

### 常用命令速查

```bash
# 构建
docker build -t employee-service:1.0.0 .              # 构建镜像
docker images                                         # 列出镜像
docker pull mysql:8.0                                 # 拉取镜像
docker rmi employee-service:1.0.0                     # 删除镜像

# 容器
docker run -d -p 8080:8080 employee-service:1.0.0     # 启动容器
docker ps                                              # 查看运行中的容器
docker ps -a                                           # 查看所有容器
docker stop employee-app                               # 停止容器
docker start employee-app                              # 启动容器
docker rm employee-app                                 # 删除容器

# 调试
docker logs -f employee-app                            # 实时查看日志
docker exec -it employee-app bash                      # 进入容器
docker stats                                           # 查看资源占用
docker inspect employee-app                            # 查看详细信息

# Compose
docker compose up -d                                   # 启动所有服务
docker compose logs -f                                 # 实时查看日志
docker compose down                                    # 停止服务
docker compose up -d --build                           # 重建并启动
```

### Spring Boot 项目 Dockerfile 模板

```dockerfile
# 多阶段构建示例（推荐用于生产）
# ============================================================
# 阶段 1：构建阶段（使用完整 JDK）
# ============================================================
FROM eclipse-temurin:17-jdk AS builder
WORKDIR /build
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# ============================================================
# 阶段 2：运行阶段（只使用 JRE）
# ============================================================
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=builder /build/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

**多阶段构建的优势：** 构建阶段包含完整的 JDK 和 Maven（镜像较大），但最终镜像只包含 JRE 和 JAR（镜像较小），构建产物自动裁剪，不需要在本地先打包。

### 实践建议

1. **多写 Dockerfile**：从简单的开始，先跑通一个 Hello World Spring Boot，再逐步复杂化。
2. **善用分层缓存**：把不变的步骤（依赖安装）放在 Dockerfile 前面，加速构建。
3. **合理使用 Volume**：任何需要持久化的数据（MySQL 数据、应用日志、上传文件）都应该挂载 Volume。
4. **调试先看日志**：`docker logs -f <容器名>` 是排查问题的第一步，Spring Boot 的启动日志、异常堆栈都在里面。
5. **Compose 管理多服务**：超过一个容器就用 Compose，服务之间通过**服务名**通信，不用关心 IP。
6. **生产环境注意**：使用非 root 用户运行、限制 JVM 内存、配置健康检查、设置 `restart: always`。

---


