// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../contracts/MessageBoard.sol";

contract DeployMessageBoard is Script {
    function run() external {
        // Retrieve private key from environment variable
        // If not set, use a default dummy key for local testing (Anvil default #0)
        uint256 deployerPrivateKey;
        try vm.envUint("PRIVATE_KEY") returns (uint256 key) {
            deployerPrivateKey = key;
        } catch {
            deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
            console.log("Using default Anvil private key");
        }

        vm.startBroadcast(deployerPrivateKey);

        MessageBoard messageBoard = new MessageBoard();
        console.log("MessageBoard deployed to:", address(messageBoard));

        vm.stopBroadcast();
    }
}
