// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract MessageBoard {
    // 定义留言结构体
    struct Message {
        address sender;
        string content;
        uint256 timestamp;
    }

    // 存储所有留言的数组
    Message[] public messages;

    // 定义留言事件，方便前端监听
    event NewMessage(address indexed sender, string content, uint256 timestamp);

    // 发送留言的函数
    function postMessage(string memory _content) public {
        // 留言内容不能为空
        require(bytes(_content).length > 0, "Message content cannot be empty");

        // 创建新留言
        Message memory newMessage = Message({
            sender: msg.sender,
            content: _content,
            timestamp: block.timestamp
        });

        // 添加到数组
        messages.push(newMessage);

        // 触发事件
        emit NewMessage(msg.sender, _content, block.timestamp);
    }

    // 获取所有留言的函数
    function getMessages() public view returns (Message[] memory) {
        return messages;
    }

    // 获取留言总数
    function getMessageCount() public view returns (uint256) {
        return messages.length;
    }
}
