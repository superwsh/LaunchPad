# BobaBrewery-BE

## 项目介绍 

基于springboot的后端接口服务，依赖mysql数据库存储数据。

目录结构介绍：

    ./docker_build.env # 构建镜像的配置文件
    ./pom.xml # maven 配置文件
    ./utils # 数据维护更新脚本
    ./common # 公共类
    ./deployment # 部署构建脚本&&文档
    ./portal-api # 后端服务代码
    ./flyway # 数据库版本管理脚本

## 打包部署步骤

### 1. 构建镜像

按照deployment目录下的文档进行打包部署即可

### 2. 数据维护

使用utils目录下的脚本进行数据维护。

首先需要拿到链上json数据作为参数，使用数据维护脚本更新数据。

    # 用法如下:
    # cd utils
    #  sh generate_update_data.sh [json_file] [server_url]
    # 样例:
    #  sh generate_update_data.sh '{"saleAddress":"0xBA12646CC07ADBe43F8bD25D83FB628D29C8A762","saleToken":"0x9A676e781A523b5d0C0e43731313A708CB607508","saleOwner":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266","tokenPriceInEth":"100000000000","totalTokens":"10000000000000000000000000","saleEndTime":1734858053,"tokensUnlockTime":1734857863,"registrationStart":1734857863,"registrationEnd":1734857983,"saleStartTime":1734857993}' localhost:8080

