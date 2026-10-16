// ================= Bank DApp =================
// ABI ของ Smart Contract Bank.sol
const ABI = [
  {
    "inputs": [],
    "name": "deposit",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "checkBlance",
    "outputs": [{ "internalType": "uint256", "name": "balance", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "owner", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "Deposit",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "owner", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "Withdraw",
    "type": "event"
  }
];

let provider = null;   // MetaMask provider
let signer = null;     // บัญชีที่เลือกใน MetaMask
let contract = null;   // instance ของ Bank contract

const $ = (id) => document.getElementById(id);

// ---------- ส่วนช่วยแสดงข้อความ ----------
function setStatus(message, isError = false) {
  const status = $("status");
  status.textContent = message;
  status.className = isError ? "status error" : "status ok";
  if (message) {
    setTimeout(() => { status.textContent = ""; }, 8000);
  }
}

function shorten(address) {
  return address.slice(0, 6) + "..." + address.slice(-4);
}

// ---------- เชื่อมต่อ MetaMask ----------
async function connectWallet() {
  if (typeof window.ethereum === "undefined") {
    setStatus("กรุณาติดตั้ง MetaMask ก่อนใช้งาน", true);
    return;
  }
  try {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    const account = await signer.getAddress();
    $("accountInfo").textContent = "🔗 " + shorten(account);
    $("connectBtn").textContent = "เชื่อมต่อแล้ว ✔";

    // ถ้าเคยกรอก contract address ไว้แล้ว ให้พร้อมใช้งานทันที
    if ($("contractAddress").value.trim()) {
      attachContract();
      refreshBalance();
    }

    // เมื่อสลับบัญชี / เครือข่าย ให้โหลดใหม่
    window.ethereum.on("accountsChanged", () => location.reload());
    window.ethereum.on("chainChanged", () => location.reload());
  } catch (err) {
    setStatus("เชื่อมต่อไม่สำเร็จ: " + err.message, true);
  }
}

// ---------- เชื่อมกับ Contract ----------
function attachContract() {
  const address = $("contractAddress").value.trim();
  if (!ethers.utils.isAddress(address)) {
    setStatus("Contract Address ไม่ถูกต้อง", true);
    return false;
  }
  localStorage.setItem("bankContractAddress", address);
  contract = new ethers.Contract(address, ABI, signer || provider);
  return true;
}

// ---------- CheckBalance ----------
async function refreshBalance() {
  if (!contract) {
    setStatus("กรุณาเชื่อมต่อ MetaMask และกรอก Contract Address ก่อน", true);
    return;
  }
  try {
    const balance = await contract.checkBlance();
    $("balance").textContent = ethers.utils.formatEther(balance) + " ETH";
  } catch (err) {
    setStatus("โหลดยอดเงินไม่สำเร็จ: " + (err.data?.message || err.message), true);
  }
}

// ---------- Deposit ----------
async function deposit() {
  if (!contract) {
    setStatus("กรุณาเชื่อมต่อ MetaMask และกรอก Contract Address ก่อน", true);
    return;
  }
  const amount = $("depositAmount").value;
  if (!amount || Number(amount) <= 0) {
    setStatus("กรุณาระบุจำนวนเงินที่ต้องการฝาก", true);
    return;
  }
  try {
    setStatus("กำลังฝากเงิน... กรุณารอสักครู่");
    const tx = await contract.deposit({
      value: ethers.utils.parseEther(amount)
    });
    setStatus("ส่งธุรกรรมแล้ว กำลังรอยืนยัน... tx: " + tx.hash);
    await tx.wait();
    setStatus("ฝากเงินสำเร็จ ✅ (" + amount + " ETH)");
    $("depositAmount").value = "";
    refreshBalance();
  } catch (err) {
    setStatus("ฝากเงินไม่สำเร็จ: " + (err.data?.message || err.message), true);
  }
}

// ---------- Withdraw ----------
async function withdraw() {
  if (!contract) {
    setStatus("กรุณาเชื่อมต่อ MetaMask และกรอก Contract Address ก่อน", true);
    return;
  }
  const amount = $("withdrawAmount").value;
  if (!amount || Number(amount) <= 0) {
    setStatus("กรุณาระบุจำนวนเงินที่ต้องการถอน", true);
    return;
  }
  try {
    setStatus("กำลังถอนเงิน... กรุณารอสักครู่");
    const tx = await contract.withdraw(ethers.utils.parseEther(amount));
    setStatus("ส่งธุรกรรมแล้ว กำลังรอยืนยัน... tx: " + tx.hash);
    await tx.wait();
    setStatus("ถอนเงินสำเร็จ ✅ (" + amount + " ETH)");
    $("withdrawAmount").value = "";
    refreshBalance();
  } catch (err) {
    setStatus("ถอนเงินไม่สำเร็จ: " + (err.data?.message || err.message), true);
  }
}

// ---------- ผูกเหตุการณ์กับปุ่ม ----------
$("connectBtn").addEventListener("click", connectWallet);
$("refreshBtn").addEventListener("click", refreshBalance);
$("depositBtn").addEventListener("click", deposit);
$("withdrawBtn").addEventListener("click", withdraw);
$("contractAddress").addEventListener("change", () => {
  if (attachContract()) {
    setStatus("บันทึก Contract Address เรียบร้อย");
    refreshBalance();
  }
});

// ---------- โหลดครั้งแรก: ดึง address ที่เคยบันทึกไว้ ----------
const savedAddress = localStorage.getItem("bankContractAddress");
if (savedAddress) {
  $("contractAddress").value = savedAddress;
}
