#!/bin/bash

# 加载环境变量
if [ -f .env ]; then
    # 处理 Windows 换行符并 source
    tr -d '\r' < .env > .env.tmp && mv .env.tmp .env
    source .env
else
    echo "错误: 未找到 .env 文件。请先复制 .env.example 并配置密钥。"
    exit 1
fi

echo "正在使用 Foundry 部署合约..."

# 检查必要的环境变量
if [[ "$SEPOLIA_URL" == *"YOUR_"* ]] || [[ "$PRIVATE_KEY" == *"YOUR_"* ]]; then
    echo "警告: 检测到 .env 中包含默认占位符。请确保已填入真实的 API Key 和私钥。"
    # 这里不强制退出，万一用户就是喜欢用这个字符串呢？但通常是没配。
fi

# 运行部署脚本
# --verify 会自动调用 Etherscan 验证源码
~/.foundry/bin/forge script script/DeployMessageBoard.s.sol:DeployMessageBoard \
    --rpc-url "$SEPOLIA_URL" \
    --broadcast \
    --verify \
    --etherscan-api-key "$ETHERSCAN_API_KEY" \
    -vvvv
