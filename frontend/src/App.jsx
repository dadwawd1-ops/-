import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import MessageBoardJSON from './abi/MessageBoard.json';
import './App.css';

const CONTRACT_ADDRESS = '0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0';

const consensusFlow = [
  { title: 'Tx Reception', detail: '节点接收用户提交交易并完成基础校验' },
  { title: 'Mempool', detail: '交易进入待打包池，按费率/优先级排序' },
  { title: 'Proposer Build', detail: '提议者构建候选区块与执行负载' },
  { title: 'PBS / MEV-Boost', detail: 'Builder 与 Relay 协作，选择最高价值区块' },
  { title: 'Attestation', detail: '验证者投票确认，进入最终性流程' },
];

const epochs = [
  { name: 'Slot 1-8', type: 'collection' },
  { name: 'Slot 9-16', type: 'execution' },
  { name: 'Slot 17-24', type: 'attest' },
  { name: 'Slot 25-32', type: 'finality' },
];

const operationRows = [
  ['verify_sig', '验证签名 / nonce / gas 边界'],
  ['execute_call', '执行 EVM 调用，读取/写入状态树'],
  ['update_state', '状态根、收据根、日志布隆过滤器更新'],
  ['compute_fee', '基础费销毁 + 优先费分配'],
  ['commit_payload', '生成执行负载并返回共识层'],
];

function App() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const checkNetwork = async () => {
    const chainId = '0x7a69';
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
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
      }
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('请安装 MetaMask!');
      return;
    }

    try {
      await checkNetwork();
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      setAccount(accounts[0]);
    } catch (err) {
      setError(`连接钱包失败: ${err.reason || err.message}`);
    }
  };

  const fetchMessages = async () => {
    if (!window.ethereum) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, MessageBoardJSON.abi, provider);
      const onchainMessages = await contract.getMessages();
      const formattedMessages = onchainMessages
        .map((msg) => ({
          sender: msg.sender,
          content: msg.content,
          timestamp: new Date(Number(msg.timestamp) * 1000).toLocaleString(),
        }))
        .reverse();
      setMessages(formattedMessages);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  const handlePost = async () => {
    if (!newMessage.trim()) return;
    if (!account) {
      await connectWallet();
      return;
    }

    setLoading(true);
    setError('');
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, MessageBoardJSON.abi, signer);
      const tx = await contract.postMessage(newMessage);
      await tx.wait();
      setNewMessage('');
      await fetchMessages();
    } catch (err) {
      setError(err.reason || err.message || '发送失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!window.ethereum) return;

    connectWallet();
    fetchMessages();

    const handleAccountsChanged = (accounts) => {
      if (accounts.length > 0) setAccount(accounts[0]);
      else setAccount(null);
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, []);

  return (
    <main className="poster">
      <header className="poster-header">
        <h1>Anatomy of an Ethereum-like Block</h1>
        <p>执行路径、共识流程与链上留言板可视化</p>
        <button className="connect-btn" onClick={connectWallet}>
          {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : '连接钱包'}
        </button>
      </header>

      <section className="panel">
        <h2>Signed Beacon Block</h2>
        <div className="grid two-col">
          <article className="subpanel">
            <h3>Execution Payload</h3>
            <table>
              <thead>
                <tr>
                  <th>字段</th>
                  <th>说明</th>
                </tr>
              </thead>
              <tbody>
                {operationRows.map(([field, desc]) => (
                  <tr key={field}>
                    <td>{field}</td>
                    <td>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>

          <article className="subpanel">
            <h3>链上留言板 (MessageBoard)</h3>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="写下你要记录在链上的内容..."
              rows={3}
            />
            <div className="composer-footer">
              <span className="error">{error}</span>
              <button onClick={handlePost} disabled={loading || !newMessage.trim()}>
                {loading ? '提交中...' : '发布交易'}
              </button>
            </div>

            <div className="message-list">
              {messages.slice(0, 4).map((msg, index) => (
                <div key={`${msg.sender}-${index}`} className="message-item">
                  <div className="message-item-head">
                    <span>{msg.sender}</span>
                    <time>{msg.timestamp}</time>
                  </div>
                  <p>{msg.content}</p>
                </div>
              ))}
              {messages.length === 0 && <p className="placeholder">暂无链上留言</p>}
            </div>
          </article>
        </div>
      </section>

      <section className="panel">
        <h2>Proposer / Builder Separation + MEV-Boost</h2>
        <div className="flow-row">
          {consensusFlow.map((item, index) => (
            <div className="flow-node" key={item.title}>
              <span className="index">{index + 1}</span>
              <h4>{item.title}</h4>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Epoch Structure & Finality</h2>
        <div className="epoch-row">
          {epochs.map((epoch) => (
            <div key={epoch.name} className={`epoch-block ${epoch.type}`}>
              <strong>{epoch.name}</strong>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;
