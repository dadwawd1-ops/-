import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import MessageBoardJSON from './abi/MessageBoard.json';

const CONTRACT_ADDRESS = "0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0";

function App() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const checkNetwork = async () => {
    const chainId = "0x7a69"; // 31337 in hex
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }],
      });
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask.
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId,
                chainName: 'Localhost 8545',
                rpcUrls: ['http://127.0.0.1:8545'],
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
              },
            ],
          });
        } catch (addError) {
          console.error(addError);
        }
      }
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("请安装 MetaMask!");
      return;
    }
    try {
      await checkNetwork();
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);
    } catch (err) {
      console.error(err);
      setError("连接钱包失败: " + (err.reason || err.message));
    }
  };

  const fetchMessages = async () => {
    if (!window.ethereum) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, MessageBoardJSON.abi, provider);
      const verifyTx = await contract.getMessages();
      // 格式化数据
      const formattedMessages = verifyTx.map(msg => ({
        sender: msg.sender,
        content: msg.content,
        timestamp: new Date(Number(msg.timestamp) * 1000).toLocaleString()
      }));
      // 倒序排列，最新的在前
      setMessages(formattedMessages.reverse());
    } catch (err) {
      console.error("Fetch error:", err);
      // 忽略部分初始化错误
    }
  };

  const handlePost = async () => {
    if (!newMessage.trim()) return;
    if (!account) {
      await connectWallet();
      return;
    }
    setLoading(true);
    setError("");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, MessageBoardJSON.abi, signer);

      const tx = await contract.postMessage(newMessage);
      await tx.wait();

      setNewMessage("");
      await fetchMessages();
    } catch (err) {
      console.error(err);
      setError(err.reason || err.message || "发送失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      connectWallet();
      fetchMessages();
    }

    // 监听账户变化
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) setAccount(accounts[0]);
        else setAccount(null);
      });
    }
  }, []);

  return (
    <div className="container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>链上留言板</h1>
        <button className="secondary-btn" onClick={connectWallet}>
          {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "连接钱包"}
        </button>
      </header>

      <div className="card">
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="写下你想永久记录在区块链上的话..."
          rows="3"
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'red', fontSize: '0.9rem' }}>{error}</span>
          <button onClick={handlePost} disabled={loading || !newMessage.trim()}>
            {loading ? <div className="loading-spinner"></div> : "发布留言"}
          </button>
        </div>
      </div>

      <div className="message-list">
        {messages.map((msg, index) => (
          <div key={index} className="card message-item">
            <div className="message-header">
              <span>{msg.sender}</span>
              <span>{msg.timestamp}</span>
            </div>
            <div className="message-content">{msg.content}</div>
          </div>
        ))}
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
            暂无留言，快来抢沙发！
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
