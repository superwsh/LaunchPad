# 合约部署

npx hardhat node
make ido

# 后端部署

cd c2n-be

## 修改配置文件

    cd deployment/docker-env

    #复制
    cp portal-api.env.example portal-api.env

## 打包后端服务

    回到c2n-be
    mvn clean install -Dmaven.test.skip=true

## 构建容器镜像

    cd portal-api
    ./docker-build.sh

## 启动服务

前往 deployment
docker compose up -d

# 前端部署

yarn install
yarn dev
