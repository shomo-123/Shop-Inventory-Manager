import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  AlertTriangle, 
  FileText, 
  LogOut, 
  Plus, 
  Search,
  Menu,
  X,
  Image as ImageIcon,
  Download,
  ShoppingCart,
  Trash2,
  Printer,
  User,
  CheckCircle,
  History,
  Calculator,
  Settings,
  Save,
  Sheet as SheetIcon,
  RefreshCw,
  Link as LinkIcon,
  Smartphone,
  Share,
  MoreVertical,
  Edit,
  Ruler
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signOut,
  signInWithCustomToken,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  serverTimestamp, 
  query, 
  orderBy,
  writeBatch,
  getDoc,
  setDoc
} from 'firebase/firestore';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyBRP9UQ-HpHkTqdWvxfZcoJwrsrKvtsEZ8",
  authDomain: "shop-inventory-manager-12b0f.firebaseapp.com",
  projectId: "shop-inventory-manager-12b0f",
  storageBucket: "shop-inventory-manager-12b0f.firebasestorage.app",
  messagingSenderId: "411496776532",
  appId: "1:411496776532:web:825d4935890f889fb6fec1",
  measurementId: "G-SMEH8E8Z1Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');

const appId = 'shop-inventory-v2';

// --- Helper: Auto Sync to Google Sheets ---
const autoSyncToSheet = async (googleToken, sheetId, rowData) => {
  if (!googleToken || !sheetId) return; 
  try {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${googleToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [rowData]
        })
      }
    );
    console.log("Auto-synced to sheet");
  } catch (err) {
    console.error("Sheet Sync Error:", err);
  }
};

// --- Main App Component ---
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('login'); 
  const [storeProfile, setStoreProfile] = useState(null);
  const [googleToken, setGoogleToken] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        setView('dashboard');
        const fetchProfile = async () => {
           try {
             const docRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'settings', 'profile');
             const docSnap = await getDoc(docRef);
             if (docSnap.exists()) {
               setStoreProfile(docSnap.data());
             } else {
               setStoreProfile({ storeName: 'My Shop', address: '', phone: '', gstin: '', sheetId: '' });
             }
           } catch (e) { console.error("Profile fetch error", e); }
        };
        fetchProfile();
      } else {
        setView('login');
        setGoogleToken(null);
      }
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (!user && view === 'login') {
    return <LoginScreen setGoogleToken={setGoogleToken} />;
  }

  return (
    <DashboardLayout 
       user={user} 
       view={view} 
       setView={setView} 
       storeProfile={storeProfile} 
       setStoreProfile={setStoreProfile}
       googleToken={googleToken}
       setGoogleToken={setGoogleToken}
    />
  );
}

// --- Login Component ---
function LoginScreen({ setGoogleToken }) {
  const [error, setError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const handleDemoLogin = async () => {
    setLoggingIn(true);
    setError('');
    try {
      await signInAnonymously(auth);
    } catch (err) {
      console.error("Anonymous Auth Error:", err);
      setError("Demo login failed.");
      setLoggingIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoggingIn(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) setGoogleToken(credential.accessToken);
    } catch (err) {
      console.error("Auth Error:", err);
      if (err.code === 'auth/unauthorized-domain' || err.code === 'auth/operation-not-allowed') {
        setError("Domain not authorized. Switching to Demo Mode...");
        handleDemoLogin();
      } else {
        setError(`Login Failed: ${err.message}`);
        setLoggingIn(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-slate-700 text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-yellow-500 p-3 rounded-full">
            <ArrowUpCircle className="text-slate-900 w-8 h-8" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Shop Inventory Manager</h2>
        <p className="text-slate-400 mb-8">Secure Inventory & Billing System</p>
        
        {error && (
          <div className="bg-yellow-500/20 text-yellow-200 p-3 rounded mb-4 text-sm border border-yellow-500/30">
            {error}
          </div>
        )}

        <button 
          onClick={handleGoogleLogin}
          disabled={loggingIn}
          className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loggingIn ? <span className="animate-pulse">Connecting...</span> : <>Sign in with Google</>}
        </button>

        <div className="mt-4 border-t border-slate-700 pt-4">
          <button 
            onClick={handleDemoLogin}
            disabled={loggingIn}
            className="text-slate-400 hover:text-white text-sm underline decoration-dashed underline-offset-4"
          >
            Skip & Use Demo Mode
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Dashboard Layout ---
function DashboardLayout({ user, view, setView, storeProfile, setStoreProfile, googleToken }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    if (!user) return;
    const invRef = collection(db, 'artifacts', appId, 'users', user.uid, 'inventory');
    const transRef = collection(db, 'artifacts', appId, 'users', user.uid, 'transactions');

    const unsubInv = onSnapshot(invRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInventory(data);
    });

    const unsubTrans = onSnapshot(transRef, (snapshot) => {
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
      setTransactions(data);
    });

    return () => { unsubInv(); unsubTrans(); };
  }, [user]);

  const lowStockItems = inventory.filter(item => item.quantity <= (item.minStock || 5));
  const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * item.price), 0);

  const NavItem = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => { setView(id); setIsMobileMenuOpen(false); }}
      className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-colors ${
        view === id 
          ? 'bg-yellow-500 text-slate-900 font-bold' 
          : 'text-slate-300 hover:bg-slate-800'
      }`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-950 border-r border-slate-800 p-4">
        <div className="flex items-center space-x-2 mb-8 px-2">
          <div className="bg-yellow-500 p-1.5 rounded-lg"><ArrowUpCircle className="text-slate-900 w-6 h-6" /></div>
          <div>
            <h1 className="text-base font-bold text-white leading-none">{storeProfile?.storeName || "Shop Manager"}</h1>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Admin Panel</span>
          </div>
        </div>
        <nav className="flex-1 space-y-2">
          <NavItem id="dashboard" label="Dashboard" icon={LayoutDashboard} />
          <NavItem id="billing" label="Billing / POS" icon={ShoppingCart} />
          <NavItem id="inventory" label="Inventory" icon={Package} />
          <NavItem id="transactions" label="Entry Log" icon={FileText} />
          <NavItem id="reports" label="Reports" icon={BarChart} />
          <div className="pt-4 mt-4 border-t border-slate-800">
             <NavItem id="settings" label="Settings" icon={Settings} />
          </div>
        </nav>
        <div className="mt-auto pt-4 border-t border-slate-800">
           <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500 truncate">
             <User size={12}/> {user?.isAnonymous ? 'Demo User' : (user?.email || 'User')}
           </div>
           <button onClick={() => signOut(auth)} className="w-full mt-2 flex items-center justify-center gap-2 bg-slate-800 hover:bg-red-900/30 text-slate-400 hover:text-red-400 py-2 rounded text-sm transition-colors">
             <LogOut size={14} /> Sign Out
           </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-slate-950 border-b border-slate-800 z-50 px-4 py-3 flex justify-between items-center">
        <span className="font-bold text-lg text-yellow-500">{storeProfile?.storeName || "Shop Manager"}</span>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>{isMobileMenuOpen ? <X /> : <Menu />}</button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-slate-900 z-40 pt-16 px-4 space-y-2">
           <NavItem id="dashboard" label="Dashboard" icon={LayoutDashboard} />
           <NavItem id="billing" label="Billing / POS" icon={ShoppingCart} />
           <NavItem id="inventory" label="Inventory" icon={Package} />
           <NavItem id="transactions" label="Entry Log" icon={FileText} />
           <NavItem id="reports" label="Reports" icon={BarChart} />
           <NavItem id="settings" label="Settings" icon={Settings} />
           <button onClick={() => signOut(auth)} className="flex items-center space-x-3 w-full p-3 rounded-lg text-red-400 hover:bg-slate-800 mt-4 border-t border-slate-800">
             <LogOut size={20} /> <span>Sign Out</span>
           </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto md:p-8 p-4 pt-20 md:pt-8 bg-slate-900">
        {view === 'dashboard' && <DashboardView inventory={inventory} lowStockItems={lowStockItems} totalValue={totalValue} transactions={transactions} storeProfile={storeProfile} />}
        {view === 'billing' && <BillingView user={user} inventory={inventory} storeProfile={storeProfile} googleToken={googleToken} />}
        {view === 'inventory' && <InventoryView user={user} inventory={inventory} googleToken={googleToken} storeProfile={storeProfile} />}
        {view === 'transactions' && <TransactionsView transactions={transactions} />}
        {view === 'reports' && <ReportsView transactions={transactions} inventory={inventory} />}
        {view === 'settings' && <SettingsView user={user} storeProfile={storeProfile} setStoreProfile={setStoreProfile} googleToken={googleToken} transactions={transactions} />}
      </main>
    </div>
  );
}

// --- VIEWS ---

function DashboardView({ inventory, lowStockItems, totalValue, transactions, storeProfile }) {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
           <h2 className="text-2xl font-bold text-white mb-1">Welcome</h2>
           <p className="text-slate-400 text-sm">Overview for {storeProfile?.storeName || "your shop"}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
           <p className="text-slate-400 text-sm">Total Value</p>
           <h3 className="text-2xl font-bold text-white mt-1">₹{totalValue.toLocaleString()}</h3>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
           <p className="text-slate-400 text-sm">Items</p>
           <h3 className="text-2xl font-bold text-white mt-1">{inventory.length}</h3>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
           <p className="text-slate-400 text-sm">Low Stock</p>
           <h3 className={`text-2xl font-bold mt-1 ${lowStockItems.length > 0 ? 'text-red-400' : 'text-white'}`}>{lowStockItems.length}</h3>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <h3 className="font-semibold text-slate-200">Recent Activity</h3>
        </div>
        <div className="divide-y divide-slate-700">
          {transactions.slice(0, 5).map(t => (
            <div key={t.id} className="p-4 flex justify-between items-center">
              <div>
                <p className="text-white font-medium">{t.itemName}</p>
                <p className="text-xs text-slate-500">{new Date(t.date?.seconds * 1000).toLocaleString()}</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                t.type === 'in' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {t.type === 'in' ? '+' : '-'}{t.quantity}
              </div>
            </div>
          ))}
          {transactions.length === 0 && <p className="p-4 text-slate-500 text-center text-sm">No recent transactions</p>}
        </div>
      </div>
    </div>
  );
}

function InventoryView({ user, inventory, googleToken, storeProfile }) {
  const [showAdd, setShowAdd] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState(null);

  const filtered = inventory.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-white">Inventory</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Search..." className="bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white w-full md:w-64" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
          </div>
          <button onClick={() => setShowAdd(true)} className="bg-yellow-500 text-slate-900 font-bold px-4 py-2 rounded-lg flex items-center gap-2"><Plus size={18} /> Add</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
        {filtered.map(item => (
          <InventoryCard 
            key={item.id} 
            item={item} 
            user={user} 
            googleToken={googleToken} 
            sheetId={storeProfile?.sheetId}
            onEdit={() => { setEditingItem(item); setShowAdd(true); }} 
          />
        ))}
      </div>
      {(showAdd || editingItem) && (
        <ItemModal 
          key={editingItem ? editingItem.id : 'new'} // FORCE RESET ON OPEN
          user={user} 
          onClose={() => { setShowAdd(false); setEditingItem(null); }} 
          initialData={editingItem} 
          googleToken={googleToken} 
          sheetId={storeProfile?.sheetId}
        />
      )}
    </div>
  );
}

function InventoryCard({ item, user, onEdit, googleToken, sheetId }) {
  const handleStock = async (type) => {
    const qty = parseInt(prompt(`Quantity to ${type === 'in' ? 'ADD' : 'REMOVE'}:`));
    if (isNaN(qty) || qty <= 0) return;
    if (type === 'out' && item.quantity < qty) return alert("Insufficient stock!");
    
    try {
      const newQty = type === 'in' ? item.quantity + qty : item.quantity - qty;
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'inventory', item.id), { quantity: newQty });
      
      const transData = {
        itemId: item.id, itemName: item.name, type, quantity: qty, priceAtTime: item.price, date: serverTimestamp()
      };
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'transactions'), transData);

      const row = [new Date().toISOString(), 'Manual-Update', item.name, type, qty, item.price, 'Stock Update'];
      autoSyncToSheet(googleToken, sheetId, row);

    } catch (e) { alert("Error updating stock"); }
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col relative group">
      <button 
        onClick={onEdit} 
        className="absolute top-2 right-2 z-10 bg-slate-900/80 text-white p-2 rounded-full hover:bg-blue-600 transition-colors shadow-lg border border-slate-600"
      >
        <Edit size={16} />
      </button>

      <div className="h-32 bg-slate-700 relative">
        {item.image ? <img src={item.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-500"><ImageIcon size={32} /></div>}
        {item.isWire && (
          <div className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded shadow">Wire / Meter</div>
        )}
      </div>
      <div className="p-4 flex-1">
        <div className="flex justify-between items-start mb-2">
          <div><h3 className="font-bold text-white">{item.name}</h3><span className="text-xs text-slate-400">{item.category}</span></div>
          <span className="text-green-400 font-bold">₹{item.price}/{item.isWire ? 'm' : 'pc'}</span>
        </div>
        <div className="flex justify-between items-center mt-4 bg-slate-900 p-2 rounded-lg">
          <span className={`text-sm font-bold ${item.quantity <= item.minStock ? 'text-red-500' : 'text-white'}`}>Stock: {item.quantity} {item.isWire ? 'm' : ''}</span>
          <div className="flex gap-1">
            <button onClick={() => handleStock('out')} className="p-1 bg-red-500/20 text-red-500 rounded"><ArrowDownCircle size={20} /></button>
            <button onClick={() => handleStock('in')} className="p-1 bg-green-500/20 text-green-500 rounded"><ArrowUpCircle size={20} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ItemModal({ user, onClose, initialData, googleToken, sheetId }) {
  const [data, setData] = useState(initialData || { 
    name: '', category: 'General', price: 0, quantity: 0, minStock: 5, image: '', description: '', isWire: false 
  });
  const [loading, setLoading] = useState(false);
  // Helper states for Coil Calculator
  const [coilQty, setCoilQty] = useState('');
  const [coilLen, setCoilLen] = useState('90'); 
  const [coilCost, setCoilCost] = useState('');

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (file && file.size < 80000) {
      const reader = new FileReader();
      reader.onloadend = () => setData({ ...data, image: reader.result });
      reader.readAsDataURL(file);
    } else if (file) alert("Image too large (Max 80KB)");
  };

  const applyCoil = () => {
    if (!coilQty || !coilLen || !coilCost) return;
    const totalMeters = parseFloat(coilQty) * parseFloat(coilLen);
    const currentQ = data.quantity || 0;
    setData({ 
      ...data, 
      quantity: currentQ + totalMeters,
      isWire: true 
    });
    alert(`Added ${totalMeters} meters to stock.`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (initialData) {
        // Check for changes to log history
        if (initialData.quantity !== data.quantity) {
           const diff = data.quantity - initialData.quantity;
           const type = diff > 0 ? 'in' : 'out';
           const log = {
             itemId: initialData.id, itemName: data.name, type, quantity: Math.abs(diff), priceAtTime: data.price, date: serverTimestamp(),
             note: "Manual Edit Correction"
           };
           await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'transactions'), log);
           // Sync Edit History to Sheet
           autoSyncToSheet(googleToken, sheetId, [new Date().toISOString(), 'Edit-Correction', data.name, type, Math.abs(diff), data.price, 'Correction']);
        }
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'inventory', initialData.id), data);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'inventory'), data);
        if (data.quantity > 0) {
           const row = [new Date().toISOString(), 'Initial-Add', data.name, 'in', data.quantity, data.price, data.category];
           autoSyncToSheet(googleToken, sheetId, row);
        }
      }
      onClose();
    } catch (e) { alert("Error saving"); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-lg border border-slate-700 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-white mb-4">{initialData ? 'Edit' : 'Add'} Item</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white" placeholder="Item Name" required value={data.name} onChange={e => setData({...data, name: e.target.value})} />
          
          <div className="grid grid-cols-2 gap-4">
            <input className="bg-slate-700 border border-slate-600 rounded p-2 text-white" placeholder="Category (e.g. Wire)" required value={data.category} onChange={e => setData({...data, category: e.target.value})} />
            <input type="number" className="bg-slate-700 border border-slate-600 rounded p-2 text-white" placeholder="Selling Price" required value={data.price} onChange={e => setData({...data, price: Number(e.target.value)})} />
          </div>

          <div className="flex items-center space-x-2 mb-2">
             <input type="checkbox" id="isWire" checked={data.isWire} onChange={e => setData({...data, isWire: e.target.checked})} className="w-4 h-4"/>
             <label htmlFor="isWire" className="text-white text-sm">This is a Wire/Cable (Sold by Meter)</label>
          </div>

          {data.isWire && (
            <div className="bg-slate-900 p-3 rounded border border-slate-600 mb-4">
               <div className="text-xs text-slate-400 mb-2 flex items-center gap-1"><Ruler size={12}/> Bulk / Coil Calculator (Adds to Stock)</div>
               <div className="flex gap-2 mb-2">
                  <input placeholder="No. of Coils" type="number" className="w-1/3 bg-slate-800 border border-slate-700 rounded p-1 text-white text-sm" value={coilQty} onChange={e => setCoilQty(e.target.value)}/>
                  <input placeholder="Length/Coil (m)" type="number" className="w-1/3 bg-slate-800 border border-slate-700 rounded p-1 text-white text-sm" value={coilLen} onChange={e => setCoilLen(e.target.value)}/>
                  <input placeholder="Cost/Coil" type="number" className="w-1/3 bg-slate-800 border border-slate-700 rounded p-1 text-white text-sm" value={coilCost} onChange={e => setCoilCost(e.target.value)}/>
               </div>
               <button type="button" onClick={applyCoil} className="w-full bg-blue-600 text-white text-xs py-1 rounded hover:bg-blue-500">Calculate & Add Meters to Stock</button>
            </div>
          )}

          <div>
            <textarea className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white h-20" placeholder="Description..." value={data.description} onChange={e => setData({...data, description: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="text-xs text-slate-400">Current Stock ({data.isWire ? 'Meters' : 'Pieces'})</label>
               <input type="number" className="bg-slate-700 border border-slate-600 rounded p-2 text-white w-full" placeholder="Qty" required value={data.quantity} onChange={e => setData({...data, quantity: Number(e.target.value)})} />
            </div>
            <div>
               <label className="text-xs text-slate-400">Low Stock Alert</label>
               <input type="number" className="bg-slate-700 border border-slate-600 rounded p-2 text-white w-full" placeholder="Min Alert" value={data.minStock} onChange={e => setData({...data, minStock: Number(e.target.value)})} />
            </div>
          </div>
          <input type="file" accept="image/*" onChange={handleImage} className="text-sm text-slate-400" />
          <div className="flex gap-2">
             <button type="button" onClick={onClose} className="flex-1 bg-slate-600 py-2 rounded text-white">Cancel</button>
             <button type="submit" disabled={loading} className="flex-1 bg-yellow-500 py-2 rounded text-slate-900 font-bold">{loading ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BillingView({ user, inventory, storeProfile, googleToken }) {
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [checkout, setCheckout] = useState(false);
  const [invoice, setInvoice] = useState(null);
  const [custName, setCustName] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [paid, setPaid] = useState('');
  const [viewHistory, setViewHistory] = useState(false);
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'invoices'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setInvoices(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [user]);

  const filtered = inventory.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
  const subtotal = cart.reduce((s, i) => s + (i.totalPrice), 0);
  const taxAmt = subtotal * (taxRate / 100);
  const grandTotal = subtotal + taxAmt;

  const addToCart = (item) => {
    const newItem = {
       ...item,
       cartQty: 1,
       selectedUnit: item.isWire ? 'm' : 'pc',
       unitMultiplier: 1,
       totalPrice: item.price
    };
    setCart([...cart, newItem]);
  };

  const updateCartItem = (index, field, value) => {
    const newCart = [...cart];
    const item = newCart[index];

    if (field === 'selectedUnit') {
       item.selectedUnit = value;
       if (value === 'm') item.unitMultiplier = 1;
       if (value === 'ft') item.unitMultiplier = 0.3048; 
       if (value === 'yd') item.unitMultiplier = 0.9144; 
    } 
    else if (field === 'cartQty') {
       item.cartQty = Number(value);
    }

    item.totalPrice = (item.cartQty * item.unitMultiplier) * item.price;
    setCart(newCart);
  };

  const handlePay = async () => {
    const batch = writeBatch(db);
    const invRef = doc(collection(db, 'artifacts', appId, 'users', user.uid, 'invoices'));
    const invData = {
      invoiceId: invRef.id.slice(0, 8).toUpperCase(),
      customerName: custName || 'Walk-in',
      items: cart, subtotal, taxAmount: taxAmt, taxRate, totalAmount: grandTotal, date: serverTimestamp(),
      storeSnapshot: storeProfile
    };
    batch.set(invRef, invData);
    
    cart.forEach(item => {
      const iRef = doc(db, 'artifacts', appId, 'users', user.uid, 'inventory', item.id);
      const deduction = item.cartQty * item.unitMultiplier;
      const curr = inventory.find(i => i.id === item.id).quantity;
      batch.update(iRef, { quantity: curr - deduction });
      
      batch.set(doc(collection(db, 'artifacts', appId, 'users', user.uid, 'transactions')), {
        itemId: item.id, itemName: item.name, type: 'out', quantity: deduction, priceAtTime: item.price, date: serverTimestamp(), invoiceId: invData.invoiceId
      });

      const row = [new Date().toISOString(), invData.invoiceId, item.name, 'out', deduction, item.price, 'Sale'];
      autoSyncToSheet(googleToken, storeProfile?.sheetId, row);
    });

    await batch.commit();
    setInvoice({...invData, date: new Date()});
    setCart([]); setCheckout(false); setCustName(''); setPaid('');
  };

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Billing / POS</h2>
        <button 
           onClick={() => setViewHistory(!viewHistory)}
           className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-700 flex items-center gap-2"
        >
          {viewHistory ? <ShoppingCart size={16}/> : <History size={16}/>}
          {viewHistory ? 'Back to POS' : 'Bill History'}
        </button>
      </div>

      {viewHistory ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700 font-bold text-white">Invoice History</div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900 text-slate-400 uppercase">
                <tr><th className="p-4">ID</th><th className="p-4">Date</th><th className="p-4">Customer</th><th className="p-4 text-right">Total</th><th className="p-4 text-center">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-700/50">
                    <td className="p-4 font-mono">{inv.invoiceId}</td>
                    <td className="p-4">{inv.date ? new Date(inv.date.seconds * 1000).toLocaleDateString() : '-'}</td>
                    <td className="p-4">{inv.customerName}</td>
                    <td className="p-4 text-right font-bold text-green-400">₹{inv.totalAmount.toFixed(2)}</td>
                    <td className="p-4 text-center">
                      <button onClick={() => setInvoice({ ...inv, date: new Date(inv.date.seconds * 1000) })} className="text-yellow-500 hover:text-yellow-400"><Printer size={18} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-180px)]">
          <div className="flex-1 bg-slate-800 rounded-xl border border-slate-700 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-700">
               <input className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-white w-full" placeholder="Search Item..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 gap-3 content-start">
              {filtered.map(item => (
                <button key={item.id} onClick={() => addToCart(item)} className="bg-slate-700 p-3 rounded-lg text-left hover:bg-slate-600">
                  <div className="font-bold text-white text-sm truncate">{item.name}</div>
                  <div className="text-yellow-500 font-bold text-xs">₹{item.price} / {item.isWire ? 'm' : 'pc'}</div>
                  <div className="text-slate-400 text-[10px]">Stock: {item.quantity.toFixed(1)}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="w-full lg:w-96 bg-slate-800 rounded-xl border border-slate-700 flex flex-col h-[600px] lg:h-auto">
             <div className="p-4 bg-slate-900 border-b border-slate-700 font-bold text-white">Cart ({cart.length})</div>
             <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {cart.map((item, idx) => (
                  <div key={idx} className="bg-slate-700/50 p-2 rounded flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                       <div className="text-white text-sm font-medium">{item.name}</div>
                       <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-red-400"><Trash2 size={16}/></button>
                    </div>
                    <div className="flex items-center gap-2">
                       <input 
                         type="number" 
                         className="w-16 bg-slate-900 border border-slate-600 rounded p-1 text-white text-xs"
                         value={item.cartQty}
                         onChange={e => updateCartItem(idx, 'cartQty', e.target.value)}
                       />
                       {item.isWire ? (
                         <select 
                           className="bg-slate-900 border border-slate-600 rounded p-1 text-white text-xs"
                           value={item.selectedUnit}
                           onChange={e => updateCartItem(idx, 'selectedUnit', e.target.value)}
                         >
                           <option value="m">Meter</option>
                           <option value="ft">Feet</option>
                           <option value="yd">Yard</option>
                         </select>
                       ) : <span className="text-xs text-slate-400">pcs</span>}
                       <div className="ml-auto text-yellow-500 font-bold text-sm">₹{item.totalPrice.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
             </div>
             <div className="p-4 bg-slate-900 border-t border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-sm text-slate-300">
                   <span>Tax Slab:</span>
                   <select 
                     value={taxRate} 
                     onChange={e => setTaxRate(Number(e.target.value))}
                     className="bg-slate-700 border border-slate-600 rounded p-1 text-white text-xs"
                   >
                     <option value={0}>No Tax (0%)</option>
                     <option value={5}>GST 5%</option>
                     <option value={12}>GST 12%</option>
                     <option value={18}>GST 18%</option>
                     <option value={28}>GST 28%</option>
                   </select>
                </div>
                <div className="flex justify-between text-slate-400 text-sm"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-slate-400 text-sm"><span>Tax</span><span>₹{taxAmt.toFixed(2)}</span></div>
                <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-slate-700"><span>Total</span><span>₹{grandTotal.toFixed(2)}</span></div>
                <button onClick={() => setCheckout(true)} disabled={cart.length===0} className="w-full bg-green-600 py-3 rounded font-bold text-white disabled:opacity-50">Checkout</button>
             </div>
          </div>
        </div>
      )}

      {checkout && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 p-6 rounded-xl w-full max-w-sm">
             <h3 className="text-xl font-bold text-white mb-4">Payment</h3>
             <input className="w-full bg-slate-700 rounded p-2 text-white mb-2" placeholder="Customer Name" value={custName} onChange={e => setCustName(e.target.value)} />
             <input type="number" className="w-full bg-slate-700 rounded p-2 text-white mb-4" placeholder="Amount Paid" value={paid} onChange={e => setPaid(e.target.value)} />
             {paid && <div className="mb-4 text-white">Change: ₹{(Number(paid) - grandTotal).toFixed(2)}</div>}
             <div className="flex gap-2">
               <button onClick={() => setCheckout(false)} className="flex-1 bg-slate-600 py-2 rounded text-white">Cancel</button>
               <button onClick={handlePay} className="flex-1 bg-green-600 py-2 rounded text-white font-bold">Confirm</button>
             </div>
          </div>
        </div>
      )}

      {invoice && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4">
           <div className="bg-white text-black p-6 rounded w-full max-w-sm h-3/4 overflow-y-auto relative">
              <button onClick={() => setInvoice(null)} className="absolute top-2 right-2"><X /></button>
              <div id="print-area" className="font-mono text-xs">
                 <div className="text-center border-b border-black pb-4 mb-4">
                    <h1 className="text-xl font-bold">{invoice.storeSnapshot?.storeName}</h1>
                    <p>{invoice.storeSnapshot?.address}</p>
                    {invoice.storeSnapshot?.gstin && <p>GSTIN: {invoice.storeSnapshot.gstin}</p>}
                 </div>
                 <div className="mb-4">Inv: {invoice.invoiceId}<br/>Date: {invoice.date.toLocaleDateString()}<br/>Cust: {invoice.customerName}</div>
                 <table className="w-full mb-4">
                   <thead><tr className="border-b border-black"><th className="text-left">Item</th><th className="text-right">Amt</th></tr></thead>
                   <tbody>{invoice.items.map((i,k) => <tr key={k}><td>{i.name} ({i.cartQty} {i.selectedUnit})</td><td className="text-right">{i.totalPrice.toFixed(2)}</td></tr>)}</tbody>
                 </table>
                 <div className="border-t border-black pt-2 text-right">
                    <div>Sub: ₹{invoice.subtotal?.toFixed(2)}</div>
                    <div>Tax ({invoice.taxRate}%): ₹{invoice.taxAmount?.toFixed(2)}</div>
                    <div className="font-bold text-lg mt-1">Total: ₹{invoice.totalAmount.toFixed(2)}</div>
                 </div>
              </div>
              <button onClick={() => window.print()} className="w-full bg-black text-white py-2 mt-4 rounded">Print Invoice</button>
           </div>
        </div>
      )}
    </div>
  );
}

function TransactionsView({ transactions }) {
  const downloadCsv = () => {
    const csv = "Date,Item,Type,Qty,Price\n" + transactions.map(t => `${new Date(t.date?.seconds*1000).toLocaleDateString()},"${t.itemName}",${t.type},${t.quantity},${t.priceAtTime}`).join("\n");
    const link = document.createElement("a");
    link.href = "data:text/csv;charset=utf-8," + encodeURI(csv);
    link.download = "logs.csv";
    link.click();
  };

  return (
    <div className="max-w-6xl mx-auto">
       <div className="flex justify-between mb-4"><h2 className="text-white font-bold text-xl">Logs</h2><button onClick={downloadCsv} className="bg-green-600 text-white px-3 py-1 rounded flex gap-2"><Download size={16}/> CSV</button></div>
       <div className="bg-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-slate-300">
             <thead className="bg-slate-900 text-slate-400"><tr><th className="p-3">Date</th><th className="p-3">Item</th><th className="p-3">Qty</th></tr></thead>
             <tbody>{transactions.map(t => <tr key={t.id} className="border-t border-slate-700"><td className="p-3">{new Date(t.date?.seconds*1000).toLocaleDateString()}</td><td className="p-3">{t.itemName}</td><td className={`p-3 font-bold ${t.type==='in'?'text-green-400':'text-red-400'}`}>{t.type==='in'?'+':'-'}{t.quantity.toFixed(1)}</td></tr>)}</tbody>
          </table>
       </div>
    </div>
  );
}

function ReportsView({ inventory }) {
   const data = inventory.reduce((acc, i) => {
     const cat = acc.find(c => c.name === i.category);
     cat ? cat.value += i.quantity : acc.push({name: i.category, value: i.quantity});
     return acc;
   }, []);

   return (
     <div className="max-w-6xl mx-auto">
        <h2 className="text-white font-bold text-xl mb-4">Stock by Category</h2>
        <div className="bg-slate-800 p-4 rounded-xl h-64">
           <ResponsiveContainer width="100%" height="100%">
             <BarChart data={data}><XAxis dataKey="name" stroke="#94a3b8"/><YAxis stroke="#94a3b8"/><Tooltip contentStyle={{backgroundColor:'#1e293b'}}/><Bar dataKey="value" fill="#eab308"/></BarChart>
           </ResponsiveContainer>
        </div>
     </div>
   );
}

function SettingsView({ user, storeProfile, setStoreProfile, googleToken }) {
  const [data, setData] = useState(storeProfile || {});
  
  const save = async (e) => {
    e.preventDefault();
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile'), data);
    setStoreProfile(data);
    alert("Saved!");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
         <h3 className="text-white font-bold mb-4">Store Profile</h3>
         <form onSubmit={save} className="space-y-4">
            <input className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white" placeholder="Store Name" value={data.storeName||''} onChange={e=>setData({...data, storeName:e.target.value})}/>
            <textarea className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white" placeholder="Address" value={data.address||''} onChange={e=>setData({...data, address:e.target.value})}/>
            <div className="grid grid-cols-2 gap-4">
               <input className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white" placeholder="Phone" value={data.phone||''} onChange={e=>setData({...data, phone:e.target.value})}/>
               <input className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white" placeholder="GSTIN" value={data.gstin||''} onChange={e=>setData({...data, gstin:e.target.value})}/>
            </div>
            <button className="bg-yellow-500 px-4 py-2 rounded font-bold w-full">Save Profile</button>
         </form>
      </div>
      
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
         <h3 className="text-white font-bold mb-4 flex items-center gap-2"><SheetIcon className="text-green-500"/> Google Sheets Auto-Sync</h3>
         <p className="text-sm text-slate-400 mb-4">To enable automatic backup of sales and inventory, paste your Google Sheet ID below.</p>
         <div className="space-y-2">
            <input className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white text-xs font-mono" placeholder="Sheet ID (e.g. 1BxiMVs0...)" value={data.sheetId||''} onChange={e=>setData({...data, sheetId:e.target.value})}/>
            <button onClick={save} className="bg-slate-600 text-white px-4 py-1 rounded text-sm">Save Sheet ID</button>
         </div>
         <div className="mt-4 p-3 bg-slate-900 rounded text-sm">
            <span className="text-slate-400">Status: </span>
            <span className={googleToken ? "text-green-400 font-bold" : "text-red-400 font-bold"}>{googleToken ? "Connected & Auto-Sync Active" : "Not Connected (Re-login)"}</span>
         </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
         <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Smartphone className="text-blue-500"/> Install App</h3>
         <p className="text-slate-400 text-sm mb-4">To install on your phone:</p>
         <ul className="list-disc pl-5 text-slate-300 text-sm space-y-2">
            <li><b>Android (Chrome):</b> Tap ⋮ dots &rarr; "Add to Home Screen"</li>
            <li><b>iOS (Safari):</b> Tap Share icon &rarr; "Add to Home Screen"</li>
         </ul>
      </div>
    </div>
  );
}
