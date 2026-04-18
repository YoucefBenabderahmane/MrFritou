import { create } from "zustand";
import type { Language } from "./i18n";

type OrderItem = {
  id: string;
  name: string;
  quantity: number;
  price: number;
  note: string;
};

type Order = {
  id: string;
  table: string;
  status: string;
  time: string;
  type: "dine-in" | "takeaway";
  items: OrderItem[];
};

const MOCK_INITIAL_ORDERS: Order[] = [
  {
    id: "#2380",
    table: "T-04",
    status: "preparing",
    time: "2 min ago",
    type: "dine-in",
    items: [
      { id: "i1", name: "Truffle Pasta", quantity: 1, price: 24.00, note: "Extra cheese on top" },
      { id: "i2", name: "Craft Cola", quantity: 2, price: 5.00, note: "" }
    ],
  },
  {
    id: "#2379",
    table: "T-12",
    status: "ready",
    time: "8 min ago",
    type: "dine-in",
    items: [
      { id: "i3", name: "Wagyu Burger", quantity: 1, price: 32.00, note: "No onions" }
    ],
  },
  {
    id: "#2378",
    table: "Takeaway",
    status: "pending",
    time: "12 min ago",
    type: "takeaway",
    items: [
      { id: "i4", name: "Caesar Salad", quantity: 2, price: 14.00, note: "Dressing on the side" },
      { id: "i5", name: "Tiramisu", quantity: 1, price: 12.00, note: "" }
    ],
  }
];

type ClientNotification = {
  id: string;
  orderId: string;
  type: "status_update" | "order_edited";
  message: string;
  timestamp: number;
};

type CurrentUser = {
  id: string;
  username: string;
  email?: string;
  role: string;
  avatar?: string | null;
};

interface OrderStore {
  currency: string;
  language: Language;
  restaurantName: string;
  restaurantAddress: string;
  restaurantLogo: string | null;
  theme: string;
  isDarkMode: boolean;
  currentUser: CurrentUser | null;
  orders: Order[];
  clientNotifications: ClientNotification[];
  lastKnownOrderCount: number;
  
  updateOrderStatus: (orderId: string, newStatus: string) => void;
  updateOrderItem: (orderId: string, itemId: string, updateFn: (item: OrderItem) => OrderItem) => void;
  removeOrderItem: (orderId: string, itemId: string) => void;
  addOrderItem: (orderId: string, item: Omit<OrderItem, "id">) => void;
  
  // General settings
  setCurrency: (currency: string) => void;
  setLanguage: (language: Language) => void;
  setRestaurantName: (name: string) => void;
  setRestaurantAddress: (address: string) => void;
  setRestaurantLogo: (logo: string | null) => void;
  setTheme: (theme: string) => void;
  toggleDarkMode: () => void;
  setDarkMode: (isDark: boolean) => void;
  setCurrentUser: (user: CurrentUser | null) => void;
  setLastKnownOrderCount: (count: number) => void;

  // Client interaction
  placeOrder: (order: Order) => void;
  clearNotifications: () => void;
}

export const useOrderStore = create<OrderStore>((set) => ({
  currency: "$",
  language: "en" as Language,
  restaurantName: "DAILY DOSE",
  restaurantAddress: "",
  restaurantLogo: null,
  theme: "orange",
  isDarkMode: false,
  currentUser: null,
  orders: MOCK_INITIAL_ORDERS,
  clientNotifications: [],
  lastKnownOrderCount: 0,

  setCurrency: (currency) => set({ currency }),
  setLanguage: (language) => set({ language }),
  setRestaurantName: (name) => set({ restaurantName: name }),
  setRestaurantAddress: (address) => set({ restaurantAddress: address }),
  setRestaurantLogo: (logo) => set({ restaurantLogo: logo }),
  setTheme: (theme) => {
    set({ theme });
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  },
  setDarkMode: (isDark) => {
    set({ isDarkMode: isDark });
    if (typeof document !== 'undefined') {
      if (isDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('darkMode', 'true');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('darkMode', 'false');
      }
    }
  },
  toggleDarkMode: () => {
    set((state) => {
      const newDark = !state.isDarkMode;
      if (typeof document !== 'undefined') {
        if (newDark) {
          document.documentElement.classList.add('dark');
          localStorage.setItem('darkMode', 'true');
        } else {
          document.documentElement.classList.remove('dark');
          localStorage.setItem('darkMode', 'false');
        }
      }
      return { isDarkMode: newDark };
    });
  },
  setCurrentUser: (user) => set({ currentUser: user }),
  setLastKnownOrderCount: (count) => set({ lastKnownOrderCount: count }),

  updateOrderStatus: (orderId, newStatus) =>
    set((state) => {
      const updatedOrders = state.orders.map((o) =>
        o.id === orderId ? { ...o, status: newStatus } : o
      );
      
      const notification: ClientNotification = {
        id: Date.now().toString(),
        orderId,
        type: "status_update",
        message: `Your order status changed to: ${newStatus.toUpperCase()}`,
        timestamp: Date.now(),
      };
      
      return { 
        orders: updatedOrders,
        clientNotifications: [...state.clientNotifications, notification] 
      };
    }),

  updateOrderItem: (orderId, itemId, updateFn) =>
    set((state) => {
      const updatedOrders = state.orders.map((order) => {
        if (order.id !== orderId) return order;
        
        return {
          ...order,
          items: order.items.map((item) =>
            item.id === itemId ? updateFn(item) : item
          ),
        };
      });
      
      const notification: ClientNotification = {
        id: Date.now().toString(),
        orderId,
        type: "order_edited",
        message: "The restaurant has adjusted your requested item quantities.",
        timestamp: Date.now(),
      };

      return { 
        orders: updatedOrders,
        clientNotifications: [...state.clientNotifications, notification] 
      };
    }),

  removeOrderItem: (orderId, itemId) =>
    set((state) => {
      let itemNameRemoved = "";
      
      const updatedOrders = state.orders.map((order) => {
        if (order.id !== orderId) return order;
        
        const removedItem = order.items.find(i => i.id === itemId);
        if (removedItem) itemNameRemoved = removedItem.name;
        
        return {
          ...order,
          items: order.items.filter((item) => item.id !== itemId),
        };
      });

      const notification: ClientNotification = {
        id: Date.now().toString(),
        orderId,
        type: "order_edited",
        message: `An item (${itemNameRemoved}) was removed from your order.`,
        timestamp: Date.now(),
      };

      return { 
        orders: updatedOrders,
        clientNotifications: [...state.clientNotifications, notification] 
      };
    }),

  addOrderItem: (orderId, newItem) =>
    set((state) => {
      const addedItem: OrderItem = { ...newItem, id: `i${Date.now()}` };
      
      const updatedOrders = state.orders.map((order) => {
        if (order.id !== orderId) return order;
        return {
          ...order,
          items: [...order.items, addedItem],
        };
      });

      const notification: ClientNotification = {
        id: Date.now().toString(),
        orderId,
        type: "order_edited",
        message: `An item (${addedItem.name}) was added to your order.`,
        timestamp: Date.now(),
      };

      return { 
        orders: updatedOrders,
        clientNotifications: [...state.clientNotifications, notification] 
      };
    }),

  placeOrder: (order) =>
    set((state) => ({ orders: [order, ...state.orders] })),
    
  clearNotifications: () =>
    set({ clientNotifications: [] })
}));
