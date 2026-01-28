
import React, { useState, useMemo, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { cn, formatCurrency, generateId, useRoomCalculator } from '../utils/helpers';
import { 
  Calendar, 
  Users, 
  Car, 
  Star, 
  Hotel as HotelIcon,
  RefreshCw,
  Copy,
  Check,
  ChevronLeft,
  ArrowRight,
  Download,
  Loader2,
  PlaneLanding,
  PlaneTakeoff,
  Info,
  Utensils,
  Plus,
  Trash2,
  Settings,
  MapPin,
  Camera,
  X,
  Map as MapIcon,
  Sparkles,
  BedDouble,
  User,
  List,
  LayoutGrid,
  ChevronDown,
  Menu,
  RotateCcw
} from 'lucide-react';
import { Card } from './ui/Card';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { HOTEL_DATA, SIGHTSEEING_DATA, VEHICLE_DATA, PACKAGES, POLICY_DATA } from '../constants';
import { Hotel, ItineraryPackage, RoomType } from '../types';
import { DestinationGallery } from './DestinationGallery';

// --- TYPES & HELPERS ---

interface FleetItem {
    id: string;
    name: string;
    count: number;
}

interface CustomDay {
    id: string;
    city: string;
    hotel: Hotel | null;
    selectedRoomType?: RoomType;
    sightseeing: string[]; 
}

const getMealPlanLabel = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes('CPAI') || t.includes('CP')) return 'Breakfast Included';
    if (t.includes('MAPAI') || t.includes('MAP')) return 'Breakfast & Dinner Included';
    if (t.includes('APAI') || t.includes('AP')) return 'All Meals Included';
    return type; 
};

// NEW: Smart Short Label to fix the "Only Breakfast" bug
const getShortMealPlan = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes('CPAI') || t.includes('CP')) return 'Breakfast';
    if (t.includes('MAPAI') || t.includes('MAP')) return 'Bfast + Dinner';
    if (t.includes('APAI') || t.includes('AP')) return 'All Meals';
    return type; 
};

const getSmartDate = (startDateStr: string, dayIndex: number, short = false) => {
    const d = new Date(startDateStr);
    d.setDate(d.getDate() + dayIndex);
    return d.toLocaleDateString('en-GB', { 
        weekday: short ? 'short' : 'long', 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
    });
};

const getVehicleString = (fleet: FleetItem[]) => {
    if (fleet.length === 0) return 'No Vehicle Selected';
    return fleet.map(f => `${f.count}x ${f.name}`).join(', ');
};

const getVehicleImg = (name: string) => {
    return VEHICLE_DATA.find(v => v.name === name)?.img || VEHICLE_DATA[0].img;
};

const generateRouteSummary = (route: string[]) => {
    if (!route || route.length === 0) return '';
    
    const summary: { city: string; nights: number }[] = [];
    let currentCity = route[0];
    let currentCount = 1;

    for (let i = 1; i < route.length; i++) {
        if (route[i] === currentCity) {
            currentCount++;
        } else {
            summary.push({ city: currentCity, nights: currentCount });
            currentCity = route[i];
            currentCount = 1;
        }
    }
    summary.push({ city: currentCity, nights: currentCount });

    return summary.map(s => `${s.city} ${s.nights}N`).join(' • ');
};

// --- SUB-COMPONENTS ---

// 1. Itinerary Header (Refactored for Mobile)
const ItineraryHeader: React.FC<{
  startDate: string;
  setStartDate: (date: string) => void;
  pax: number;
  setPax: (pax: number) => void;
  fleet: FleetItem[];
  onOpenFleetModal: () => void;
  guestName: string;
  setGuestName: (name: string) => void;
  onBack: () => void;
  onUpdateRates?: () => void;
}> = ({ startDate, setStartDate, pax, setPax, fleet, onOpenFleetModal, guestName, setGuestName, onBack, onUpdateRates }) => {
  const { theme, getTextColor, getInputClass } = useTheme();

  return (
    <div className={cn(
        "sticky top-0 z-30 flex flex-col gap-4 p-4 md:p-6 rounded-2xl shadow-sm border backdrop-blur-md transition-colors",
        theme === 'light' ? "bg-white/90 border-slate-200" : "bg-slate-900/90 border-white/10"
    )}>
        <div className="flex items-center justify-between">
            <button 
                onClick={onBack}
                className={cn("flex items-center gap-2 text-sm font-bold transition-all hover:-translate-x-1", theme === 'light' ? "text-slate-500 hover:text-slate-800" : "text-white/60 hover:text-white")}
            >
                <ChevronLeft size={16} /> Change Destination
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 md:items-end">
            <div className="space-y-1.5">
                <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider opacity-60">Start Date</label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className={cn("pl-10 pr-4 py-2.5 rounded-xl border w-full font-medium text-sm", getInputClass())} 
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider opacity-60">Travelers (Pax)</label>
                <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <select 
                        value={pax}
                        onChange={(e) => setPax(Number(e.target.value))}
                        className={cn("pl-10 pr-8 py-2.5 rounded-xl border w-full font-medium text-sm appearance-none", getInputClass())}
                    >
                        {[2,3,4,5,6,7,8,9,10,12,14,16,18,20].map(n => <option key={n} value={n}>{n} Pax</option>)}
                    </select>
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider opacity-60">Transport</label>
                <button 
                    onClick={onOpenFleetModal}
                    className={cn(
                        "flex items-center justify-between w-full px-4 py-2.5 rounded-xl border text-left transition-all", 
                        theme === 'light' ? 'bg-white border-slate-200 hover:border-blue-400' : 'bg-white/5 border-white/10 hover:border-white/30'
                    )}
                >
                    <div className="flex items-center gap-2 overflow-hidden">
                        <Car size={16} className="opacity-50 shrink-0" />
                        <span className={cn("text-sm font-bold truncate", getTextColor())}>
                            {getVehicleString(fleet)}
                        </span>
                    </div>
                    <Settings size={14} className="opacity-40 shrink-0" />
                </button>
            </div>

            <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider opacity-60">Guest Name</label>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="Name"
                        className={cn("px-4 py-2.5 rounded-xl border w-full font-medium text-sm", getInputClass())} 
                    />
                    <Button onClick={onUpdateRates} className="bg-slate-900 text-white shrink-0 px-4">
                        <RotateCcw size={16} className="mr-2" />
                        Update Rates
                    </Button>
                </div>
            </div>
        </div>
    </div>
  );
};

// 2. Fleet Manager Modal (Unchanged)
const FleetManager: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  fleet: FleetItem[];
  onAddVehicle: () => void;
  onRemoveVehicle: (id: string) => void;
  onUpdateVehicle: (id: string, field: 'name' | 'count', value: any) => void;
}> = ({ isOpen, onClose, fleet, onAddVehicle, onRemoveVehicle, onUpdateVehicle }) => {
  const { getTextColor, theme } = useTheme();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Transport Fleet">
        <div className="space-y-4">
            <p className={cn("text-sm opacity-60", getTextColor())}>
                Configure the exact mix of vehicles for this trip. 
            </p>
            
            <div className="space-y-3">
                {fleet.map((vehicle) => {
                    const vehicleImg = getVehicleImg(vehicle.name);
                    return (
                        <div key={vehicle.id} className="flex items-center gap-3 p-3 rounded-xl border bg-slate-50/50">
                            <div className="w-16 h-12 bg-white rounded-lg border overflow-hidden shrink-0">
                                <img src={vehicleImg} alt={vehicle.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <label className="text-[10px] font-bold uppercase opacity-50 block mb-1">Vehicle Type</label>
                                <select 
                                    value={vehicle.name}
                                    onChange={(e) => onUpdateVehicle(vehicle.id, 'name', e.target.value)}
                                    className={cn("w-full bg-transparent font-bold text-sm outline-none truncate", getTextColor())}
                                >
                                    {VEHICLE_DATA.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
                                </select>
                            </div>
                            
                            <div className="w-20 shrink-0">
                                <label className="text-[10px] font-bold uppercase opacity-50 block mb-1 text-center">Qty</label>
                                <input 
                                    type="number"
                                    min="1"
                                    value={vehicle.count}
                                    onChange={(e) => onUpdateVehicle(vehicle.id, 'count', parseInt(e.target.value) || 1)}
                                    className={cn("w-full p-1 bg-white border rounded text-center font-bold", getTextColor())}
                                />
                            </div>

                            <button 
                                onClick={() => onRemoveVehicle(vehicle.id)}
                                className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors mt-4"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    );
                })}
            </div>

            <Button variant="secondary" onClick={onAddVehicle} className="w-full border-dashed border-2">
                <Plus size={16} /> Add Another Vehicle
            </Button>

            <div className="pt-4 border-t flex justify-end">
                <Button onClick={onClose}>Done</Button>
            </div>
        </div>
    </Modal>
  );
};

// 3. Pricing Control Deck (Mobile Optimized)
const PricingControlDeck: React.FC<{
  pricing: { netTotal: number; finalTotal: number; perPerson: number } | null;
  markupType: 'percent' | 'fixed';
  setMarkupType: (type: 'percent' | 'fixed') => void;
  markupValue: number;
  setMarkupValue: (val: number) => void;
  onBack: () => void;
  onOpenFleetModal: () => void;
  onGeneratePDF: () => void;
  onCopyQuote: () => void;
  isPdfLoading: boolean;
  copyFeedback: boolean;
}> = ({ 
  pricing, markupType, setMarkupType, markupValue, setMarkupValue, 
  onBack, onOpenFleetModal, onGeneratePDF, onCopyQuote, 
  isPdfLoading, copyFeedback 
}) => {
  const { theme, getTextColor } = useTheme();
  const [showMarkup, setShowMarkup] = useState(false);

  return (
    <div className={cn(
        "sticky top-0 z-40 border-b shadow-lg backdrop-blur-xl transition-colors flex flex-col p-3 md:p-4 gap-3 md:gap-4",
        theme === 'light' ? "bg-white/95 border-slate-200" : "bg-slate-900/95 border-white/10"
    )}>
        <div className="flex items-center justify-between">
            <button 
                onClick={onBack}
                className="flex items-center gap-2 text-xs md:text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
            >
                <ChevronLeft size={16} /> <span className="hidden md:inline">Back to Gallery</span><span className="md:hidden">Back</span>
            </button>

            {/* Mobile-friendly Markup Toggle */}
            <div className="flex items-center gap-2 md:gap-4 bg-gray-50 p-1 md:p-1.5 rounded-lg border border-gray-200">
                <button 
                    onClick={() => setShowMarkup(!showMarkup)} 
                    className="md:hidden p-1 text-slate-400"
                >
                    <Settings size={14} />
                </button>
                
                <div className={cn("flex flex-col px-2", showMarkup ? "flex" : "hidden md:flex")}>
                    <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1">
                        <Info size={10} /> Net
                    </span>
                    <span className="text-xs md:text-sm font-mono font-bold text-gray-500">
                        {formatCurrency(pricing?.netTotal || 0)}
                    </span>
                </div>
                
                <div className={cn("h-8 w-px bg-gray-300", showMarkup ? "block" : "hidden md:block")}></div>
                
                <div className={cn("flex items-center gap-2", showMarkup ? "flex" : "hidden md:flex")}>
                    <button 
                        onClick={() => setMarkupType(markupType === 'percent' ? 'fixed' : 'percent')}
                        className="px-2 py-1 text-[10px] font-bold bg-white rounded shadow-sm min-w-[24px]"
                    >
                        {markupType === 'percent' ? '%' : '₹'}
                    </button>
                    <input 
                        type="number" 
                        value={markupValue}
                        onChange={(e) => setMarkupValue(Number(e.target.value))}
                        className="w-12 md:w-16 bg-transparent text-center text-sm font-bold outline-none"
                        placeholder="0"
                    />
                </div>
            </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-2 border-t border-gray-500/10">
            <div className="flex items-baseline gap-2 w-full md:w-auto justify-between md:justify-start">
                <div className="flex items-baseline gap-2">
                    <p className="text-2xl md:text-3xl font-mono font-bold text-blue-600 leading-none tracking-tight">
                        {formatCurrency(pricing?.finalTotal || 0)}
                    </p>
                    <span className="text-[10px] md:text-xs text-slate-400 font-bold uppercase">Total</span>
                </div>
                <span className="px-2 py-1 rounded bg-gray-100 text-gray-500 text-[10px] md:text-xs font-bold border border-gray-200">
                    @ {formatCurrency(pricing?.perPerson || 0)} / person
                </span>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
                <Button 
                    size="sm" 
                    variant="secondary" 
                    onClick={onOpenFleetModal}
                    className="flex-1 md:flex-none h-9 md:h-10 px-3 md:px-4 border-dashed border-2 bg-blue-50/50 text-blue-600 hover:bg-blue-100/50 hover:border-blue-300"
                >
                    <Car size={16} /> <span className="ml-1 md:ml-2 text-xs md:text-sm">Fleet</span>
                </Button>

                <Button variant="secondary" onClick={onGeneratePDF} disabled={isPdfLoading} className="flex-1 md:flex-none h-9 md:h-10 px-3 md:px-4 min-w-0">
                    {isPdfLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    <span className="ml-1 md:ml-2 text-xs md:text-sm truncate">{isPdfLoading ? '...' : 'PDF'}</span>
                </Button>
                <Button onClick={onCopyQuote} className={cn("flex-1 md:flex-none h-9 md:h-10 px-3 md:px-4 gap-1 md:gap-2 transition-all min-w-0", copyFeedback ? "bg-emerald-600" : "bg-blue-600")}>
                    {copyFeedback ? <Check size={16} /> : <Copy size={16} />}
                    <span className="text-xs md:text-sm truncate">{copyFeedback ? "Copied" : "Copy"}</span>
                </Button>
            </div>
        </div>
    </div>
  );
};

// 4. Timeline View (Updated with Room Details)
const TimelineView: React.FC<{
  activePackage: ItineraryPackage;
  startDate: string;
  pax: number;
  fleet: FleetItem[];
  hotelOverrides: Record<number, { hotel: Hotel, roomType: RoomType }>;
  sightseeingOverrides: Record<number, string[]>;
  baseTier: 'Budget' | 'Premium';
  onSwapHotel: (dayIndex: number, city: string) => void;
  onUpdateRoomType: (dayIndex: number, hotel: Hotel, roomType: RoomType) => void; // NEW PROP
  onOpenFleetModal: () => void;
}> = ({ 
    activePackage, 
    startDate, 
    pax, 
    fleet, 
    hotelOverrides, 
    sightseeingOverrides, 
    baseTier, 
    onSwapHotel, 
    onUpdateRoomType,
    onOpenFleetModal 
}) => {
  const { theme, getTextColor } = useTheme();

  return (
    <div className="relative border-l-2 border-slate-200 ml-2 md:ml-4 space-y-8 md:space-y-12 pb-10">
        {/* --- TRANSPORT CARD --- */}
        <div className="mb-8 pl-6 md:pl-8 relative animate-in fade-in slide-in-from-left-4 duration-500">
            <div className={cn(
                "absolute -left-[9px] top-6 w-4 h-4 rounded-full border-4 shadow-sm z-10 bg-indigo-500 border-white"
            )} />
            <div className={cn("p-4 md:p-5 rounded-2xl border shadow-sm", theme === 'light' ? "bg-white border-slate-200" : "bg-white/5 border-white/10")}>
                <div className="flex items-center justify-between mb-4 border-b border-dashed border-slate-200 pb-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                            <Car size={20} />
                        </div>
                        <div>
                            <h3 className={cn("text-base md:text-lg font-bold font-serif", getTextColor())}>Transport</h3>
                            <p className="text-[10px] md:text-xs opacity-60">Allocated for entire trip</p>
                        </div>
                    </div>
                    <Button size="sm" variant="secondary" onClick={onOpenFleetModal}>
                        <Settings size={14} /> <span className="hidden md:inline ml-1">Configure</span>
                    </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                    {fleet.map((vehicle) => (
                        <div key={vehicle.id} className="flex gap-3 p-2 rounded-xl border bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                            <div className="w-16 h-12 md:w-20 md:h-14 shrink-0 rounded-lg overflow-hidden relative shadow-sm border border-white">
                                <img src={getVehicleImg(vehicle.name)} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={vehicle.name} />
                            </div>
                            <div className="flex flex-col justify-center min-w-0">
                                <span className={cn("font-bold text-sm truncate", getTextColor())}>{vehicle.name}</span>
                                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-0.5">AC Vehicle</span>
                                <span className="text-xs px-1.5 py-0.5 rounded bg-white border shadow-sm w-fit font-mono font-bold mt-1 text-indigo-600">
                                    Qty: {vehicle.count}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* --- DAY LOOPS --- */}
        {activePackage.route.map((city, index) => {
            const override = hotelOverrides[index];
            
            // Resolve Defaults if no override
            let hotelData: Hotel | undefined;
            let roomData: RoomType | undefined;

            if (override) {
                hotelData = override.hotel;
                roomData = override.roomType;
            } else {
                const cityHotels = HOTEL_DATA[city] || [];
                hotelData = cityHotels.find(h => h.tier === baseTier) || cityHotels[0];
                if (hotelData) {
                    roomData = hotelData.roomTypes[0]; // Default to first room type
                }
            }

            const mealPlanLabel = hotelData ? getMealPlanLabel(hotelData.type) : 'No Meals';
            const roomCount = roomData ? useRoomCalculator(pax, roomData.capacity) : 0;
            
            // Sightseeing
            const dayOverrides = sightseeingOverrides[index];
            const allSightseeing = SIGHTSEEING_DATA[city] || [];
            const sights = dayOverrides 
                ? allSightseeing.filter(s => dayOverrides.includes(s.name))
                : allSightseeing;

            const isFirstDay = index === 0;
            const isLastDay = index === activePackage.route.length - 1;

            return (
                <div key={index} className="relative pl-6 md:pl-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Timeline Dot */}
                    <div className={cn(
                        "absolute -left-[9px] top-0 w-4 h-4 rounded-full border-4 shadow-sm z-10",
                        isFirstDay ? "bg-blue-500 border-white" : "bg-slate-300 border-white"
                    )} />
                    
                    <div className="flex flex-col gap-4">
                        {/* Day Header with SMART DATE */}
                        <div>
                            <h3 className={cn("text-lg md:text-xl font-bold font-serif flex items-center gap-2", getTextColor())}>
                                <span className="opacity-50">Day {index + 1}</span>
                                <span className="mx-1 opacity-30">•</span>
                                <span>{getSmartDate(startDate, index)}</span>
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className={cn("text-base md:text-lg font-bold text-slate-700", getTextColor())}>{city}</span>
                                {isFirstDay && <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200 uppercase tracking-wider">Arrival</span>}
                                {isLastDay && <span className="text-[9px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded border border-orange-200 uppercase tracking-wider">Departure</span>}
                            </div>
                            {isFirstDay && <p className="text-[10px] md:text-xs text-blue-600 flex items-center gap-1 mt-1 font-medium"><PlaneLanding size={12}/> Pickup from Bhuj</p>}
                            {isLastDay && <p className="text-[10px] md:text-xs text-orange-600 flex items-center gap-1 mt-1 font-medium"><PlaneTakeoff size={12}/> Drop at Bhuj</p>}
                        </div>

                        {/* Hotel Card */}
                        {!isLastDay && hotelData && roomData && (
                            <div className={cn("group relative rounded-xl border overflow-hidden transition-all hover:shadow-md", theme === 'light' ? "bg-white border-slate-200" : "bg-white/5 border-white/10")}>
                                <div className="flex flex-col sm:flex-row">
                                    {/* Mobile: Image is a banner on top. Desktop: Side image. */}
                                    <div className="h-32 sm:h-auto sm:w-48 relative shrink-0">
                                        <img src={hotelData.img} alt={hotelData.name} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/10" />
                                        <div className="absolute bottom-2 left-2 sm:hidden">
                                            <span className={cn("text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider backdrop-blur-md border border-white/20 text-white bg-black/30")}>
                                                {hotelData.tier}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="p-4 flex-1 flex flex-col justify-center">
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h4 className={cn("font-bold text-base md:text-lg truncate", getTextColor())}>{hotelData.name}</h4>
                                                    <span className={cn("hidden sm:inline-block text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider", hotelData.tier === 'Premium' ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600")}>
                                                        {hotelData.tier}
                                                    </span>
                                                </div>
                                                
                                                <div className="flex flex-col gap-2 mt-2">
                                                    {/* ROOM TYPE SELECTOR (Responsive) */}
                                                    <div className="flex items-center gap-2">
                                                        <HotelIcon size={14} className="opacity-50 shrink-0" />
                                                        <div className="relative flex-1 sm:flex-none">
                                                            <select
                                                                value={roomData.name}
                                                                onChange={(e) => {
                                                                    const newRoom = hotelData?.roomTypes.find(r => r.name === e.target.value);
                                                                    if (newRoom && hotelData) onUpdateRoomType(index, hotelData, newRoom);
                                                                }}
                                                                className={cn(
                                                                    "w-full sm:w-auto text-xs font-bold bg-transparent outline-none cursor-pointer border-b border-dashed border-slate-300 hover:border-blue-500 hover:text-blue-600 transition-colors py-1 pr-4 appearance-none", 
                                                                    getTextColor()
                                                                )}
                                                            >
                                                                {hotelData.roomTypes.map(r => (
                                                                    <option key={r.name} value={r.name}>{r.name} (Max {r.capacity})</option>
                                                                ))}
                                                            </select>
                                                            <ChevronDown size={10} className="absolute right-0 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
                                                        </div>
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 border text-slate-500 whitespace-nowrap">
                                                            {roomCount} Rms
                                                        </span>
                                                    </div>

                                                    <p className="text-xs font-medium text-emerald-600 flex items-center gap-1"><Utensils size={12}/> {mealPlanLabel}</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => onSwapHotel(index, city)}
                                                className="text-[10px] text-blue-500 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 border border-blue-100 mt-1 sm:mt-0 w-full sm:w-auto"
                                            >
                                                <RefreshCw size={10} /> Change Hotel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Included Sightseeing (Horizontal Scroll) */}
                        {sights.length > 0 ? (
                            <div className="mt-1">
                                <div className="flex items-center gap-2 mb-2 opacity-80">
                                    <Check size={12} className="text-green-500" />
                                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500">Included Sightseeing</span>
                                </div>
                                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar snap-x -mr-4 pr-4 md:mr-0 md:pr-0">
                                    {sights.map((spot, i) => (
                                        <div key={i} className="min-w-[140px] w-[140px] snap-center">
                                            <div className="aspect-video rounded-lg overflow-hidden mb-1.5 relative group shadow-sm border border-slate-100">
                                                <img src={spot.img} alt={spot.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                            <h5 className={cn("font-bold text-xs truncate leading-tight", getTextColor())}>{spot.name}</h5>
                                            <p className="text-[9px] opacity-60 line-clamp-1 mt-0.5">{spot.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            dayOverrides && dayOverrides.length === 0 && (
                                <div className="mt-2 text-xs opacity-40 italic pl-1">No sightseeing selected for this day.</div>
                            )
                        )}
                    </div>
                </div>
            );
        })}
    </div>
  );
};

// --- CUSTOM BUILDER COMPONENT (Command Center) ---

const CustomBuilder: React.FC<{
    onComplete: (days: CustomDay[]) => void;
    onCancel: () => void;
    guestName: string; setGuestName: (n: string) => void;
    pax: number; setPax: (n: number) => void;
    startDate: string; setStartDate: (d: string) => void;
    fleet: FleetItem[];
    onOpenFleetModal: () => void;
}> = ({ 
    onComplete, onCancel, 
    guestName, setGuestName, 
    pax, setPax, 
    startDate, setStartDate, 
    fleet, onOpenFleetModal 
}) => {
    const { theme, getTextColor, getInputClass } = useTheme();
    
    // --- Trip State ---
    const [days, setDays] = useState<CustomDay[]>([]);
    
    // --- Current Day Builder State ---
    const [city, setCity] = useState<string>('Bhuj');
    const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
    const [selectedRoomType, setSelectedRoomType] = useState<RoomType | undefined>(undefined);
    const [selectedSpots, setSelectedSpots] = useState<string[]>([]);
    const [isAllHotelsModalOpen, setIsAllHotelsModalOpen] = useState(false);
    
    // Mobile Tab State
    const [mobileTab, setMobileTab] = useState<'editor' | 'timeline'>('editor');
    
    // Auto-select first hotel when city changes to speed up flow
    useEffect(() => {
        setSelectedHotel(null);
        setSelectedRoomType(undefined);
        setSelectedSpots([]);
    }, [city]);

    const handleAddDay = () => {
        const newDay: CustomDay = {
            id: generateId(),
            city,
            hotel: selectedHotel,
            selectedRoomType: selectedRoomType, // Save room type
            sightseeing: selectedSpots
        };
        setDays([...days, newDay]);
        
        // Reset selections but keep city for potential multi-day stay
        setSelectedHotel(null);
        setSelectedRoomType(undefined);
        setSelectedSpots([]);
    };

    const handleRemoveDay = (index: number) => {
        setDays(days.filter((_, i) => i !== index));
    };

    const handleDuplicateDay = (index: number) => {
        const dayToClone = days[index];
        const newDay = { ...dayToClone, id: generateId() };
        // Insert after the current day
        const newDays = [...days];
        newDays.splice(index + 1, 0, newDay);
        setDays(newDays);
    };

    // Calculate Live Estimated Cost
    const totalCost = useMemo(() => {
        let cost = 0;
        // Transport
        fleet.forEach(v => {
            const vData = VEHICLE_DATA.find(vd => vd.name === v.name);
            if (vData) cost += vData.rate * v.count * (days.length || 1);
        });
        // Hotels
        days.forEach(d => {
            if (d.hotel && d.selectedRoomType) {
                const roomCount = useRoomCalculator(pax, d.selectedRoomType.capacity);
                cost += d.selectedRoomType.rate * roomCount;
            }
        });
        return cost;
    }, [days, fleet, pax]);

    // Handle Hotel Selection
    const selectHotel = (hotel: Hotel) => {
        setSelectedHotel(hotel);
        if (hotel.roomTypes.length > 0) {
            setSelectedRoomType(hotel.roomTypes[0]); // Default to first room type
        }
    };

    return (
        <div className="fixed inset-0 md:left-64 z-40 bg-white flex flex-col font-sans animate-in fade-in duration-300">
            
            {/* 1. RESPONSIVE HEADER */}
            <div className="shrink-0 bg-white border-b border-slate-200 z-50">
                {/* Mobile Top Row: Back | Title/Cost | Action */}
                <div className="md:hidden flex items-center justify-between p-4 pb-2">
                    <button onClick={onCancel} className="p-2 -ml-2 text-slate-500">
                        <ChevronLeft size={24} />
                    </button>
                    <div className="text-center">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Est.</p>
                        <p className="text-lg font-mono font-bold text-emerald-600 leading-none">{formatCurrency(totalCost)}</p>
                    </div>
                    <Button size="sm" onClick={() => onComplete(days)} disabled={days.length === 0} className="bg-slate-900 text-white">
                        Finish
                    </Button>
                </div>

                {/* Input Scroll Area (Desktop Header) */}
                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar px-4 pb-3 md:p-4 md:h-16">
                    <button onClick={onCancel} className="hidden md:flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mr-2">
                        <ChevronLeft size={20} />
                        <span className="font-bold text-sm">Back</span>
                    </button>
                    
                    <div className="hidden md:block h-6 w-px bg-slate-200 mx-2"></div>

                    {/* Inputs */}
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200 shrink-0">
                        <User size={14} className="text-slate-400" />
                        <input 
                            value={guestName} 
                            onChange={(e) => setGuestName(e.target.value)} 
                            className="bg-transparent text-sm font-bold w-24 outline-none text-slate-700 placeholder:text-slate-400"
                            placeholder="Guest Name"
                        />
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200 shrink-0">
                        <Users size={14} className="text-slate-400" />
                        <select 
                            value={pax} 
                            onChange={(e) => setPax(Number(e.target.value))}
                            className="bg-transparent text-sm font-bold outline-none text-slate-700 cursor-pointer"
                        >
                            {[2,4,6,8,10,12,14,16].map(n => <option key={n} value={n}>{n} Pax</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200 shrink-0">
                        <Calendar size={14} className="text-slate-400" />
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-transparent text-sm font-bold outline-none text-slate-700 cursor-pointer w-28"
                        />
                    </div>

                    <button 
                        onClick={onOpenFleetModal}
                        className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition-all text-left group shrink-0"
                    >
                        <Car size={14} className="text-slate-400 group-hover:text-blue-500" />
                        <span className="text-sm font-bold text-slate-700 truncate max-w-[150px]">{getVehicleString(fleet)}</span>
                    </button>

                    {/* Desktop Right Side */}
                    <div className="hidden md:flex items-center gap-4 ml-auto">
                        <div className="text-right">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Est. Cost</p>
                            <p className="text-lg font-mono font-bold text-emerald-600 leading-none">{formatCurrency(totalCost)}</p>
                        </div>
                        <Button onClick={() => onComplete(days)} disabled={days.length === 0} className="bg-slate-900 text-white px-6">
                            Finalize Trip <ArrowRight size={16} />
                        </Button>
                    </div>
                </div>
            </div>

            {/* 2. SPLIT WORKSPACE */}
            <div className="flex-1 flex overflow-hidden relative">
                
                {/* LEFT PANEL: SPEED EDITOR */}
                <div className={cn(
                    "flex flex-col border-r border-slate-200 bg-white transition-all",
                    "md:w-[70%]", // Desktop Width
                    mobileTab === 'editor' ? "absolute inset-0 z-10 w-full md:static" : "hidden md:flex" // Mobile Toggle
                )}>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-8 md:space-y-10 pb-32 md:pb-6">
                    
                        {/* 1. City Selection (Tabs) */}
                        <div className="space-y-4">
                            <h2 className="text-lg font-bold font-serif text-slate-800 flex items-center gap-2">
                                <MapPin size={20} className="text-blue-500" /> Select Base Location
                            </h2>
                            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                {Object.keys(HOTEL_DATA).map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setCity(c)}
                                        className={cn(
                                            "px-6 py-4 rounded-2xl border-2 text-lg font-bold transition-all min-w-[140px] flex flex-col items-start gap-1 hover:scale-105",
                                            city === c 
                                                ? "border-blue-500 bg-blue-50 text-blue-700 shadow-lg shadow-blue-100" 
                                                : "border-slate-100 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
                                        )}
                                    >
                                        <span>{c}</span>
                                        <span className="text-[10px] uppercase font-normal tracking-wider opacity-60">Gujarat</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 2. Instant Hotel Cards */}
                        <div className="space-y-4">
                            <h2 className="text-lg font-bold font-serif text-slate-800 flex items-center gap-2">
                                <BedDouble size={20} className="text-purple-500" /> Recommended Stays
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {(HOTEL_DATA[city] || []).slice(0, 3).map((hotel, idx) => {
                                    const isSelected = selectedHotel?.name === hotel.name;
                                    
                                    // Default display is based on first room type
                                    const displayRoom = hotel.roomTypes[0];
                                    
                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => selectHotel(hotel)}
                                            className={cn(
                                                "group relative rounded-2xl overflow-hidden border-2 transition-all text-left flex flex-col cursor-pointer",
                                                isSelected 
                                                    ? "border-blue-500 ring-4 ring-blue-500/20 shadow-xl" 
                                                    : "border-transparent hover:border-slate-300 shadow-sm"
                                            )}
                                        >
                                            <div className="h-28 w-full relative">
                                                <img src={hotel.img} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                                {isSelected && (
                                                    <div className="absolute top-2 right-2 bg-blue-500 text-white p-1 rounded-full shadow-lg">
                                                        <Check size={14} strokeWidth={3} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-3 bg-slate-50 flex-1 flex flex-col justify-between">
                                                <div>
                                                    <h4 className="font-bold text-sm text-slate-800 leading-tight line-clamp-1">{hotel.name}</h4>
                                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mt-1">{hotel.tier}</p>
                                                </div>
                                                
                                                {/* Dynamic Room Selector - Only show if this hotel is selected */}
                                                {isSelected && selectedRoomType ? (
                                                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                                                        <select 
                                                            value={selectedRoomType.name}
                                                            onChange={(e) => {
                                                                const room = hotel.roomTypes.find(r => r.name === e.target.value);
                                                                if(room) setSelectedRoomType(room);
                                                            }}
                                                            className="w-full text-xs font-bold bg-white border border-blue-300 rounded px-1 py-1 outline-none text-slate-700"
                                                        >
                                                            {hotel.roomTypes.map(r => (
                                                                <option key={r.name} value={r.name}>{r.name} (Max {r.capacity})</option>
                                                            ))}
                                                        </select>
                                                        <div className="flex justify-between items-end mt-2">
                                                            <div className="text-[10px] font-bold text-slate-500">
                                                                {useRoomCalculator(pax, selectedRoomType.capacity)} Room(s)
                                                            </div>
                                                            <span className="font-mono font-bold text-emerald-600">{formatCurrency(selectedRoomType.rate)}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-between items-end mt-2">
                                                        <span className="text-xs font-medium text-slate-400">{getShortMealPlan(hotel.type)}</span>
                                                        <span className="font-mono font-bold text-slate-500 text-xs">From {formatCurrency(displayRoom.rate)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="text-center">
                                <button 
                                    onClick={() => setIsAllHotelsModalOpen(true)}
                                    className="text-xs font-bold text-slate-400 hover:text-blue-500 transition-colors uppercase tracking-wider"
                                >
                                    View All {HOTEL_DATA[city]?.length} Hotels
                                </button>
                            </div>
                        </div>

                        {/* 3. Sightseeing Grid */}
                        <div className="space-y-4">
                            <h2 className="text-lg font-bold font-serif text-slate-800 flex items-center gap-2">
                                <Camera size={20} className="text-pink-500" /> Sightseeing
                            </h2>
                            <div className="flex flex-wrap gap-3">
                                {(SIGHTSEEING_DATA[city] || []).map((spot, i) => {
                                    const isSelected = selectedSpots.includes(spot.name);
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => {
                                                if (isSelected) setSelectedSpots(selectedSpots.filter(s => s !== spot.name));
                                                else setSelectedSpots([...selectedSpots, spot.name]);
                                            }}
                                            className={cn(
                                                "px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all flex items-center gap-2",
                                                isSelected 
                                                    ? "bg-emerald-50 border-emerald-500 text-emerald-700" 
                                                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                            )}
                                        >
                                            {isSelected && <Check size={14} />}
                                            {spot.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                    </div>

                    {/* Footer Action */}
                    <div className="p-4 md:p-6 border-t border-slate-200 bg-white/95 backdrop-blur shrink-0 flex justify-center absolute bottom-0 md:relative w-full z-20 md:z-0">
                        <Button onClick={handleAddDay} className="w-full max-w-2xl py-4 h-auto text-lg shadow-xl shadow-blue-500/20">
                            Add Day to Itinerary <ArrowRight size={20} />
                        </Button>
                    </div>
                </div>

                {/* RIGHT PANEL: LIVE TIMELINE (Mobile: Toggle, Desktop: 30%) */}
                <div className={cn(
                    "h-full overflow-y-auto bg-slate-50 p-4 transition-all",
                    "md:w-[30%]", // Desktop Width
                    mobileTab === 'timeline' ? "absolute inset-0 z-10 w-full md:static" : "hidden md:block" // Mobile Toggle
                )}>
                    <div className="mb-4">
                        <h3 className="font-bold text-lg font-serif text-slate-800">Your Trip Timeline</h3>
                        <p className="text-xs text-slate-500">{days.length} Days Planned</p>
                    </div>

                    <div className="space-y-4 pb-24 md:pb-20">
                        {days.length === 0 && (
                            <div className="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                <List size={32} className="mb-2 opacity-50" />
                                <p className="text-sm font-medium">No days added yet.</p>
                            </div>
                        )}

                        {days.map((day, idx) => (
                            <div key={day.id} className="group relative bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => handleDuplicateDay(idx)}
                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Duplicate Day"
                                    >
                                        <Copy size={14} />
                                    </button>
                                    <button 
                                        onClick={() => handleRemoveDay(idx)}
                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Remove Day"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>

                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                                        {idx + 1}
                                    </div>
                                    <h4 className="font-bold text-slate-800">{day.city}</h4>
                                </div>

                                <div className="space-y-2 ml-11">
                                    {day.hotel && day.selectedRoomType ? (
                                        <div className="text-sm">
                                            <div className="font-bold text-slate-700">{day.hotel.name}</div>
                                            <div className="text-[10px] text-slate-500 uppercase tracking-wider flex flex-col">
                                                <span>{day.selectedRoomType.name} ({useRoomCalculator(pax, day.selectedRoomType.capacity)} Rooms)</span>
                                                <span className="text-emerald-600 font-bold">{getMealPlanLabel(day.hotel.type)}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-xs text-slate-400 italic">No hotel selected</div>
                                    )}

                                    {day.sightseeing.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {day.sightseeing.map(s => (
                                                <span key={s} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded font-medium border border-slate-200">
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* MOBILE BOTTOM TABS */}
                <div className="md:hidden absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-2 z-30 flex gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                    <button 
                        onClick={() => setMobileTab('editor')}
                        className={cn(
                            "flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors", 
                            mobileTab === 'editor' ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-500"
                        )}
                    >
                        <LayoutGrid size={18} /> Builder
                    </button>
                    <button 
                        onClick={() => setMobileTab('timeline')}
                        className={cn(
                            "flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors relative", 
                            mobileTab === 'timeline' ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-500"
                        )}
                    >
                        <List size={18} /> Timeline
                        {days.length > 0 && <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full absolute top-2 right-12">{days.length}</span>}
                    </button>
                </div>

            </div>

            <Modal 
                isOpen={isAllHotelsModalOpen} 
                onClose={() => setIsAllHotelsModalOpen(false)} 
                title={`All Hotels in ${city}`}
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(HOTEL_DATA[city] || []).map((hotel, idx) => {
                        const isSelected = selectedHotel?.name === hotel.name;
                        return (
                            <button
                                key={idx}
                                onClick={() => {
                                    selectHotel(hotel); // Use selectHotel to set defaults
                                    setIsAllHotelsModalOpen(false);
                                }}
                                className={cn(
                                    "group relative rounded-xl overflow-hidden border-2 transition-all text-left flex flex-col h-64",
                                    isSelected 
                                        ? "border-blue-500 ring-4 ring-blue-500/20 shadow-xl" 
                                        : "border-transparent bg-slate-50 hover:border-slate-300"
                                )}
                            >
                                <div className="h-40 w-full relative shrink-0">
                                    <img src={hotel.img} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                    {isSelected && (
                                        <div className="absolute top-2 right-2 bg-blue-500 text-white p-1 rounded-full shadow-lg">
                                            <Check size={14} strokeWidth={3} />
                                        </div>
                                    )}
                                </div>
                                <div className="p-3 flex-1 flex flex-col justify-between w-full bg-white">
                                    <div>
                                        <h4 className={cn("font-bold text-sm text-slate-800 leading-tight line-clamp-1", getTextColor())}>{hotel.name}</h4>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mt-1">{hotel.tier}</p>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs font-medium text-slate-400">{getShortMealPlan(hotel.type)}</span>
                                        <span className="font-mono font-bold text-emerald-600">From {formatCurrency(hotel.roomTypes[0].rate)}</span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </Modal>
        </div>
    );
};

// --- INTERNAL COMPONENT: KUTCH BUILDER (Gallery State Update) ---

const KutchBuilder: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { theme, getTextColor } = useTheme();
  
  // Core State
  const [view, setView] = useState<'gallery' | 'editor' | 'custom_builder'>('gallery');
  const [pax, setPax] = useState(2);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [guestName, setGuestName] = useState('Guest');
  
  // Gallery Smart Config State (Local to Gallery Cards)
  const [gallerySharingMode, setGallerySharingMode] = useState<'Double' | 'Quad'>('Double');

  // Selection State
  const [selectedPkgId, setSelectedPkgId] = useState<string | null>(null);
  const [baseTier, setBaseTier] = useState<'Budget' | 'Premium'>('Budget');
  const [hotelOverrides, setHotelOverrides] = useState<Record<number, { hotel: Hotel, roomType: RoomType }>>({}); 
  const [sightseeingOverrides, setSightseeingOverrides] = useState<Record<number, string[]>>({}); // NEW: Track custom sightseeing
  
  // Custom Package State
  const [customPackage, setCustomPackage] = useState<ItineraryPackage | null>(null);

  // Fleet State
  const [fleet, setFleet] = useState<FleetItem[]>([]);
  const [isManualFleet, setIsManualFleet] = useState(false); 
  const [isFleetModalOpen, setIsFleetModalOpen] = useState(false);
  
  // Markup State
  const [markupType, setMarkupType] = useState<'percent' | 'fixed'>('percent');
  const [markupValue, setMarkupValue] = useState<number>(0);

  // UI State
  const [swapModal, setSwapModal] = useState<{ dayIndex: number; city: string } | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  // --- LOGIC: AUTO-SELECT TRANSPORT ---
  useEffect(() => {
      if (!isManualFleet) {
          const autoFleet: FleetItem[] = [];
          const id = generateId();
          
          if (pax <= 4) {
              autoFleet.push({ id, name: 'Sedan (Dzire)', count: 1 });
          } else if (pax <= 6) {
              autoFleet.push({ id, name: 'Innova', count: 1 });
          } else if (pax <= 12) {
              autoFleet.push({ id, name: 'Tempo Traveller', count: 1 });
          } else {
              autoFleet.push({ id, name: 'Tempo Traveller', count: Math.ceil(pax / 12) });
          }
          setFleet(autoFleet);
      }
  }, [pax, isManualFleet]);

  // --- LOGIC: PRICING ENGINE ---
  const calculatePrice = (pkg: ItineraryPackage, tier: 'Budget' | 'Premium', overrides: Record<number, { hotel: Hotel, roomType: RoomType }> = {}) => {
      let transportCost = 0;
      fleet.forEach(item => {
          const vehicleData = VEHICLE_DATA.find(v => v.name === item.name);
          if (vehicleData) {
              transportCost += (vehicleData.rate * item.count * pkg.days);
          }
      });

      let hotelCost = 0;
      pkg.route.forEach((city, index) => {
          let override = overrides[index];
          let rate = 0;
          let capacity = 2; // Default

          if (override) {
              rate = override.roomType.rate;
              capacity = override.roomType.capacity;
          } else {
              // Fallback logic for standard packages not using overrides map yet
              const cityHotels = HOTEL_DATA[city] || [];
              const hotel = cityHotels.find(h => h.tier === tier) || cityHotels[0];
              if (hotel) {
                  // Default to first room type if no specific override
                  rate = hotel.roomTypes[0].rate;
                  capacity = hotel.roomTypes[0].capacity;
              }
          }
          
          const roomsNeeded = useRoomCalculator(pax, capacity);
          hotelCost += (rate * roomsNeeded);
      });

      const netTotal = transportCost + hotelCost;
      return { netTotal, perPerson: pax > 0 ? Math.round(netTotal / pax) : 0 };
  };

  // --- LOGIC: GALLERY SMART PRICING ---
  const calculateGalleryPrice = (pkg: ItineraryPackage, tier: 'Budget' | 'Premium') => {
      const activePax = pax; // Use main pax state
      const targetCapacity = gallerySharingMode === 'Quad' ? 4 : 2;
      let totalHotelCost = 0;

      // Logic: Iterate cities, find room with capacity >= target. If not found, fallback to capacity 2.
      pkg.route.forEach(city => {
          const cityHotels = HOTEL_DATA[city] || [];
          const hotel = cityHotels.find(h => h.tier === tier) || cityHotels[0];
          
          if (hotel) {
              // Smart Match: Find specific capacity, or closest fallback
              let selectedRoom = hotel.roomTypes.find(r => r.capacity === targetCapacity);
              if (!selectedRoom) selectedRoom = hotel.roomTypes[0]; // Fallback to standard

              const roomsNeeded = useRoomCalculator(activePax, selectedRoom.capacity);
              totalHotelCost += (selectedRoom.rate * roomsNeeded);
          }
      });

      // Simple transport estimate for gallery view (1 vehicle per 4 pax roughly)
      const estimatedVehicleCost = 3500 * Math.ceil(activePax/4) * pkg.days; 
      
      const total = totalHotelCost + estimatedVehicleCost;
      return total; // Total Package Cost
  };

  // Resolve Active Package (Standard or Custom)
  const activePackage = selectedPkgId === 'custom' 
      ? customPackage 
      : PACKAGES.find(p => p.id === selectedPkgId);

  const editorPricing = useMemo(() => {
      if (!activePackage) return null;
      const { netTotal } = calculatePrice(activePackage, baseTier, hotelOverrides);
      
      let finalTotal = netTotal;
      if (markupType === 'percent') finalTotal = netTotal * (1 + markupValue / 100);
      else finalTotal = netTotal + markupValue;

      return { 
          netTotal, 
          finalTotal, 
          perPerson: pax > 0 ? Math.round(finalTotal / pax) : 0
      };
  }, [activePackage, baseTier, hotelOverrides, fleet, pax, markupType, markupValue]);

  // --- HANDLER: FLEET MANAGEMENT ---
  const handleAddVehicle = () => {
      setIsManualFleet(true);
      setFleet([...fleet, { id: generateId(), name: 'Sedan (Dzire)', count: 1 }]);
  };

  const handleRemoveVehicle = (id: string) => {
      setIsManualFleet(true);
      const newFleet = fleet.filter(f => f.id !== id);
      setFleet(newFleet);
  };

  const handleUpdateVehicle = (id: string, field: 'name' | 'count', value: any) => {
      setIsManualFleet(true);
      setFleet(fleet.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  // --- HANDLER: PACKAGE SELECTION ---
  const handleSelectPackage = (pkgId: string, tier: 'Budget' | 'Premium') => {
      setSelectedPkgId(pkgId);
      setBaseTier(tier);
      setHotelOverrides({}); // Reset overrides to use defaults
      setSightseeingOverrides({}); 
      setMarkupValue(0);
      
      // Inherit settings from Gallery Config
      // Pax is already set in state
      
      setView('editor');
  };

  const handleUpdateRoomType = (dayIndex: number, hotel: Hotel, roomType: RoomType) => {
      setHotelOverrides(prev => ({
          ...prev,
          [dayIndex]: { hotel, roomType }
      }));
  };

  // --- HANDLER: CUSTOM BUILDER COMPLETE ---
  const handleCustomComplete = (days: CustomDay[]) => {
      const newCustomPkg: ItineraryPackage = {
          id: 'custom',
          name: 'Your Custom Journey',
          img: 'https://rannutsav.net/wp-content/uploads/2025/08/white-desert-600x500.webp', // Generic cover
          days: days.length,
          route: days.map(d => d.city)
      };

      // Build Hotel & Sightseeing Overrides Map
      const newHotelOverrides: Record<number, { hotel: Hotel, roomType: RoomType }> = {};
      const newSightseeingOverrides: Record<number, string[]> = {};

      days.forEach((day, idx) => {
          if (day.hotel && day.selectedRoomType) {
              newHotelOverrides[idx] = { hotel: day.hotel, roomType: day.selectedRoomType };
          }
          // Explicitly set the sightseeing selections for this day
          newSightseeingOverrides[idx] = day.sightseeing || [];
      });

      setCustomPackage(newCustomPkg);
      setHotelOverrides(newHotelOverrides);
      setSightseeingOverrides(newSightseeingOverrides);
      setSelectedPkgId('custom');
      setView('editor');
  };

  // ... (handleCopyQuotation, handleDownloadPdf Unchanged) ...
  const handleCopyQuotation = () => {
      if (!activePackage || !editorPricing) return;

      const dateRangeStr = `${getSmartDate(startDate, 0, true)} - ${getSmartDate(startDate, activePackage.days - 1, true)}`;
      
      const lines = [];
      lines.push(`🌟 *Quotation by THE TOURISM EXPERTS* 🌟`);
      lines.push(``);
      lines.push(`📅 *Trip Summary*`);
      lines.push(`👥 Guests: ${pax} Adults`);
      lines.push(`⏳ Duration: ${activePackage.days - 1} Nights / ${activePackage.days} Days`);
      lines.push(`🗓 Dates: ${dateRangeStr}`);
      lines.push(`🚗 Vehicles: ${getVehicleString(fleet)}`);
      lines.push(``);

      activePackage.route.forEach((city, index) => {
          const override = hotelOverrides[index];
          let hotelName = "Not Included";
          let mealPlan = "";
          let roomTypeStr = "";

          if (override) {
              hotelName = override.hotel.name;
              mealPlan = getMealPlanLabel(override.hotel.type);
              roomTypeStr = override.roomType.name;
          } else {
              // Fallback logic for standard packages
              const cityHotels = HOTEL_DATA[city] || [];
              const hotel = cityHotels.find(h => h.tier === baseTier) || cityHotels[0];
              if (hotel) {
                  hotelName = hotel.name;
                  mealPlan = getMealPlanLabel(hotel.type);
                  roomTypeStr = hotel.roomTypes[0].name;
              }
          }
          
          const dayOverrides = sightseeingOverrides[index];
          const allSightseeing = SIGHTSEEING_DATA[city] || [];
          const sights = dayOverrides 
              ? allSightseeing.filter(s => dayOverrides.includes(s.name))
              : allSightseeing;
          
          let dayTitle = `*Day ${index + 1} (${getSmartDate(startDate, index, true)}): ${city}`;
          if (index === 0) dayTitle += " (Arrival)*";
          else if (index === activePackage.days - 1) dayTitle += " (Departure)*";
          else dayTitle += "*";

          lines.push(dayTitle);
          lines.push(`🏨 Stay: ${hotelName} (${roomTypeStr})`);
          if (hotelName !== "Not Included") lines.push(`🍽 Plan: ${mealPlan}`);
          
          if (sights.length > 0) {
              lines.push(`📍 Sightseeing:`);
              sights.forEach(s => {
                  lines.push(`• ${s.name}: ${s.desc}`);
              });
          }
          lines.push(``);
      });

      lines.push(`📝 *Inclusions:*`);
      POLICY_DATA.inclusions.forEach(inc => lines.push(`✅ ${inc}`));
      lines.push(``);

      lines.push(`💰 *Total Cost: ${formatCurrency(editorPricing.finalTotal)}*`);
      lines.push(`👤 *Per Person: ${formatCurrency(editorPricing.perPerson)}*`);

      navigator.clipboard.writeText(lines.join('\n'));
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleDownloadPdf = async () => {
      // ... (Implementation same as previous, ensured by context)
      if (!activePackage || !editorPricing) return;
      setIsPdfLoading(true);
      try {
          const input = document.getElementById('pdf-template');
          if (!input) throw new Error("Template not found");
          const html2canvas = (await import('html2canvas')).default;
          const { jsPDF } = await import('jspdf');
          const canvas = await html2canvas(input, { scale: 2, useCORS: true, allowTaint: true, logging: false, backgroundColor: '#ffffff' });
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const ratio = pdfWidth / canvas.width;
          const finalHeight = canvas.height * ratio;
          let heightLeft = finalHeight;
          let position = 0;
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, finalHeight);
          heightLeft -= pdfHeight;
          while (heightLeft >= 0) {
            position = heightLeft - finalHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, finalHeight);
            heightLeft -= pdfHeight;
          }
          pdf.save(`Kutch_Quote_${guestName.replace(/\s+/g, '_')}.pdf`);
      } catch (err) {
          console.error("PDF Generation failed:", err);
          alert("Could not generate PDF. Please try again.");
      } finally {
          setIsPdfLoading(false);
      }
  };

  return (
    <div className="animate-in fade-in duration-500">
        
        {/* --- VIEW 1: GALLERY --- */}
        {view === 'gallery' && (
            <div className="space-y-8">
                
                {/* Clean, Unified Header */}
                <ItineraryHeader 
                    startDate={startDate} setStartDate={setStartDate}
                    pax={pax} setPax={setPax}
                    fleet={fleet} onOpenFleetModal={() => setIsFleetModalOpen(true)}
                    guestName={guestName} setGuestName={setGuestName}
                    onBack={onBack}
                    onUpdateRates={() => {
                        // Dummy action to trigger reactivity if needed, or visual feedback
                        // Since 'pax' state drives everything, changing it updates rates instantly.
                        // This button reinforces the action for the user.
                    }}
                />

                {/* Package Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    
                    {/* CUSTOM BUILDER CARD */}
                    <button 
                        onClick={() => setView('custom_builder')}
                        className={cn(
                            "flex flex-col items-center justify-center text-center p-8 rounded-2xl border-2 border-dashed transition-all group h-[380px]", // Increased height
                            theme === 'light' ? "border-blue-300 bg-blue-50/50 hover:bg-blue-50" : "border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20"
                        )}
                    >
                        <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <Sparkles size={32} className="text-blue-600" />
                        </div>
                        <h3 className={cn("text-xl font-bold font-serif mb-2", getTextColor())}>Create Your Own</h3>
                        <p className="text-sm opacity-60 max-w-[200px] leading-relaxed">
                            Build a fully customized day-by-day itinerary from scratch.
                        </p>
                        <div className="mt-6 flex items-center gap-2 text-sm font-bold text-blue-600 group-hover:underline">
                            Start Building <ArrowRight size={16} />
                        </div>
                    </button>

                    {PACKAGES.map((pkg) => {
                        // Calculate price dynamically based on active pax
                        const budgetTotal = calculateGalleryPrice(pkg, 'Budget');
                        const premiumTotal = calculateGalleryPrice(pkg, 'Premium');
                        
                        const budgetPerPerson = pax > 0 ? Math.round(budgetTotal / pax) : 0;
                        const premiumPerPerson = pax > 0 ? Math.round(premiumTotal / pax) : 0;

                        return (
                            <Card key={pkg.id} noPadding className="flex flex-col hover:shadow-xl transition-all duration-300 overflow-hidden group border-0 ring-1 ring-slate-200">
                                <div className="h-48 relative overflow-hidden">
                                    <img src={pkg.img} alt={pkg.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                    <div className="absolute bottom-4 left-4 text-white">
                                        <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-sm px-2 py-1 rounded border border-white/20">
                                            {pkg.days - 1}N / {pkg.days}D
                                        </span>
                                        <h3 className="text-xl font-bold font-serif mt-2 shadow-sm">{pkg.name}</h3>
                                    </div>
                                    
                                    {/* Quick Sharing Toggle Inside Card (New Feature) */}
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur rounded-lg p-1 shadow-sm flex items-center gap-1">
                                        <span className="text-[9px] font-bold text-slate-500 uppercase px-1">Mode</span>
                                        <select 
                                            value={gallerySharingMode}
                                            onChange={(e) => setGallerySharingMode(e.target.value as any)}
                                            className="text-[10px] font-bold bg-transparent outline-none cursor-pointer text-slate-800"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <option value="Double">2 Pax</option>
                                            <option value="Quad">4 Pax</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="p-5 flex-1 flex flex-col justify-between">
                                    {/* Route Summary */}
                                    <div className="mb-4">
                                        <div className={cn("flex items-start gap-1.5 text-xs font-bold uppercase tracking-wider opacity-60 mb-1", getTextColor())}>
                                            <MapPin size={12} className="mt-0.5" /> Route Summary
                                        </div>
                                        <p className={cn("text-sm font-medium leading-snug", getTextColor())}>
                                            {generateRouteSummary(pkg.route)}
                                        </p>
                                    </div>

                                    {/* Dynamic Price Display */}
                                    <div className="space-y-3 mt-auto">
                                        <button 
                                            onClick={() => handleSelectPackage(pkg.id, 'Budget')}
                                            className="w-full flex justify-between items-center p-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all group/btn"
                                        >
                                            <div className="text-left">
                                                <div className="text-xs font-bold uppercase text-slate-500">Budget</div>
                                                <div className="text-lg font-mono font-bold text-slate-900 group-hover/btn:text-blue-700">{formatCurrency(budgetTotal)}</div>
                                                <div className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">
                                                    Total for {pax} Adults
                                                    <span className="opacity-60 ml-1">(@ {formatCurrency(budgetPerPerson)}/pp)</span>
                                                </div>
                                            </div>
                                            <ArrowRight size={16} className="opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all text-blue-500" />
                                        </button>

                                        <button 
                                            onClick={() => handleSelectPackage(pkg.id, 'Premium')}
                                            className="w-full flex justify-between items-center p-3 rounded-xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50 transition-all group/btn"
                                        >
                                            <div className="text-left">
                                                <div className="text-xs font-bold uppercase text-slate-500">Premium</div>
                                                <div className="text-lg font-mono font-bold text-slate-900 group-hover/btn:text-amber-700">{formatCurrency(premiumTotal)}</div>
                                                <div className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">
                                                    Total for {pax} Adults
                                                    <span className="opacity-60 ml-1">(@ {formatCurrency(premiumPerPerson)}/pp)</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Star size={12} className="text-amber-400 fill-amber-400" />
                                                <ArrowRight size={16} className="opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all text-amber-600" />
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            </div>
        )}

        {/* --- VIEW 3: CUSTOM BUILDER --- */}
        {view === 'custom_builder' && (
            <CustomBuilder 
                onCancel={() => setView('gallery')}
                onComplete={handleCustomComplete}
                // Props passed for Command Center Header
                guestName={guestName} setGuestName={setGuestName}
                pax={pax} setPax={setPax}
                startDate={startDate} setStartDate={setStartDate}
                fleet={fleet} 
                onOpenFleetModal={() => setIsFleetModalOpen(true)}
            />
        )}

        {/* --- VIEW 2: EDITOR --- */}
        {view === 'editor' && activePackage && (
            <>
                <PricingControlDeck 
                    pricing={editorPricing}
                    markupType={markupType} setMarkupType={setMarkupType}
                    markupValue={markupValue} setMarkupValue={setMarkupValue}
                    onBack={() => setView('gallery')}
                    onOpenFleetModal={() => setIsFleetModalOpen(true)}
                    onGeneratePDF={handleDownloadPdf}
                    onCopyQuote={handleCopyQuotation}
                    isPdfLoading={isPdfLoading}
                    copyFeedback={copyFeedback}
                />
                
                <div className="max-w-5xl mx-auto p-4 md:p-8">
                    <TimelineView 
                        activePackage={activePackage}
                        startDate={startDate}
                        pax={pax}
                        fleet={fleet}
                        hotelOverrides={hotelOverrides}
                        sightseeingOverrides={sightseeingOverrides}
                        baseTier={baseTier}
                        onSwapHotel={(dayIndex, city) => setSwapModal({ dayIndex, city })}
                        onUpdateRoomType={handleUpdateRoomType} // PASSED HANDLER
                        onOpenFleetModal={() => setIsFleetModalOpen(true)}
                    />
                </div>
            </>
        )}

        {/* --- MODALS & HIDDEN CONTENT --- */}
        
        <FleetManager 
            isOpen={isFleetModalOpen} 
            onClose={() => setIsFleetModalOpen(false)}
            fleet={fleet}
            onAddVehicle={handleAddVehicle}
            onRemoveVehicle={handleRemoveVehicle}
            onUpdateVehicle={handleUpdateVehicle}
        />

        {swapModal && (
            <Modal isOpen={true} onClose={() => setSwapModal(null)} title={`Change Hotel in ${swapModal.city}`}>
                <div className="space-y-4">
                    {(HOTEL_DATA[swapModal.city] || []).map((hotel, idx) => {
                        const currentOverride = hotelOverrides[swapModal.dayIndex];
                        const defaultHotel = (HOTEL_DATA[swapModal.city] || []).find(h => h.tier === baseTier);
                        const currentHotel = currentOverride ? currentOverride.hotel : defaultHotel;
                        
                        // Safety check
                        if (!currentHotel) return null;

                        const isSelected = currentHotel.name === hotel.name;
                        
                        // Price diff calculation considering default rooms
                        const newRate = hotel.roomTypes[0].rate * useRoomCalculator(pax, hotel.roomTypes[0].capacity);
                        const currentRate = currentOverride 
                            ? currentOverride.roomType.rate * useRoomCalculator(pax, currentOverride.roomType.capacity)
                            : (defaultHotel ? defaultHotel.roomTypes[0].rate * useRoomCalculator(pax, defaultHotel.roomTypes[0].capacity) : 0);

                        const diff = newRate - currentRate;

                        return (
                            <button
                                key={idx}
                                onClick={() => {
                                    // Default to first room type when swapping
                                    setHotelOverrides(prev => ({ ...prev, [swapModal.dayIndex]: { hotel: hotel, roomType: hotel.roomTypes[0] } }));
                                    setSwapModal(null);
                                }}
                                className={cn(
                                    "w-full flex items-center gap-4 p-3 rounded-xl border transition-all text-left group",
                                    isSelected 
                                        ? "bg-blue-50 border-blue-500 ring-1 ring-blue-500" 
                                        : "bg-white border-slate-200 hover:border-blue-300"
                                )}
                            >
                                <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0">
                                    <img src={hotel.img} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className={cn("font-bold text-sm", getTextColor())}>{hotel.name}</span>
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 border text-slate-500 uppercase font-bold">{hotel.tier}</span>
                                    </div>
                                    <p className="text-xs opacity-60 mt-1">{getMealPlanLabel(hotel.type)}</p>
                                </div>
                                <div className="text-right">
                                    <div className="font-mono font-bold text-slate-700 text-sm">{formatCurrency(newRate)}</div>
                                    {!isSelected && (
                                        <div className={cn("text-[10px] font-bold", diff > 0 ? "text-rose-500" : "text-emerald-500")}>
                                            {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                                        </div>
                                    )}
                                    {isSelected && <div className="text-[10px] text-blue-600 font-bold flex items-center gap-1 justify-end"><Check size={10} /> Selected</div>}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </Modal>
        )}

        {/* --- HIDDEN PDF TEMPLATE --- */}
        {activePackage && editorPricing && (
            <div id="pdf-template" style={{ position: 'absolute', left: '-9999px', top: 0, width: '794px', minHeight: '1123px', background: 'white', fontFamily: 'serif', color: '#1e293b' }}>
               {/* PDF Content (Similar to previous, but using roomType names) */}
               {/* ... (Keep existing layout logic, just ensuring props are passed correctly) */}
               <div className="relative h-[280px] w-full overflow-hidden">
                    <img src={activePackage.img} alt="Cover" className="w-full h-full object-cover" crossOrigin="anonymous" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                    <div className="absolute top-0 left-0 right-0 p-6 flex justify-center">
                        <div className="bg-white/95 backdrop-blur-md px-6 py-3 rounded-b-xl shadow-lg border-t-0 border border-white/20">
                            <h1 className="text-2xl font-extrabold tracking-widest text-slate-900 font-sans">THE TOURISM EXPERTS</h1>
                        </div>
                    </div>
                    <div className="absolute bottom-8 left-8 text-white w-[90%]">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="bg-emerald-500 text-white px-3 py-1 rounded text-xs font-bold uppercase tracking-widest shadow-lg">
                                {activePackage.days - 1} Nights / {activePackage.days} Days
                            </span>
                        </div>
                        <h1 className="text-5xl font-bold font-serif mb-2 leading-tight drop-shadow-lg">{activePackage.name}</h1>
                        <p className="text-lg opacity-90 font-light tracking-wide">Premium Kutch Itinerary Prepared for {guestName}</p>
                    </div>
                </div>

                <div className="px-8 pt-8">
                    <div className="grid grid-cols-4 border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                        <div className="p-4 border-r border-slate-200 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Guests</p>
                            <p className="text-lg font-bold text-slate-800">{pax} Adults</p>
                        </div>
                        <div className="p-4 border-r border-slate-200 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Vehicle</p>
                            <p className="text-lg font-bold text-slate-800 text-xs">
                                {getVehicleString(fleet)}
                            </p>
                        </div>
                        <div className="p-4 border-r border-slate-200 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Check-in</p>
                            <p className="text-lg font-bold text-slate-800">{getSmartDate(startDate, 0, true)}</p>
                        </div>
                        <div className="p-4 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Check-out</p>
                            <p className="text-lg font-bold text-slate-800">{getSmartDate(startDate, activePackage.days - 1, true)}</p>
                        </div>
                    </div>
                </div>

                <div className="px-8 pt-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3 border-b border-slate-100 pb-1">Your Private Fleet</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {fleet.map((vehicle) => (
                            <div key={vehicle.id} className="flex items-center gap-4 p-3 rounded-xl border border-slate-200 bg-white">
                                <div className="w-20 h-14 rounded-lg overflow-hidden border border-slate-100 shrink-0">
                                    <img src={getVehicleImg(vehicle.name)} alt={vehicle.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
                                </div>
                                <div>
                                    <span className="text-lg font-bold text-slate-800">{vehicle.count}x {vehicle.name}</span>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide">Private AC Vehicle</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="px-8 py-8">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 border-b border-slate-100 pb-1">Day-by-Day Itinerary</h3>
                    <div className="border-l-2 border-slate-200 ml-4 space-y-8">
                        {activePackage.route.map((city, index) => {
                            const override = hotelOverrides[index];
                            let hotelName = "Not Included";
                            let mealPlan = "";
                            let roomTypeStr = "";
                            let hotelImg = "";
                            let tier = "";

                            if (override) {
                                hotelName = override.hotel.name;
                                mealPlan = getMealPlanLabel(override.hotel.type);
                                roomTypeStr = override.roomType.name;
                                hotelImg = override.hotel.img;
                                tier = override.hotel.tier;
                            } else {
                                const cityHotels = HOTEL_DATA[city] || [];
                                const hotel = cityHotels.find(h => h.tier === baseTier) || cityHotels[0];
                                if (hotel) {
                                    hotelName = hotel.name;
                                    mealPlan = getMealPlanLabel(hotel.type);
                                    roomTypeStr = hotel.roomTypes[0].name;
                                    hotelImg = hotel.img;
                                    tier = hotel.tier;
                                }
                            }
                            
                            const dayOverrides = sightseeingOverrides[index];
                            const allSightseeing = SIGHTSEEING_DATA[city] || [];
                            const sights = dayOverrides 
                                ? allSightseeing.filter(s => dayOverrides.includes(s.name))
                                : allSightseeing;

                            const isLastDay = index === activePackage.route.length - 1;

                            return (
                                <div key={index} className="relative pl-8">
                                    <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-slate-800 border-4 border-white shadow-sm" />
                                    
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center justify-between border-b border-dashed border-slate-200 pb-2">
                                            <h3 className="text-xl font-bold text-slate-800 font-serif">Day {index + 1} - {getSmartDate(startDate, index)}</h3>
                                            <span className="text-sm font-bold text-slate-500">{city}</span>
                                        </div>
                                        
                                        {!isLastDay && (
                                            <div className="flex gap-4 items-start">
                                                {hotelName !== "Not Included" ? (
                                                    <>
                                                        <div className="w-32 h-20 rounded-lg overflow-hidden shrink-0 border border-slate-200">
                                                            <img src={hotelImg} className="w-full h-full object-cover" crossOrigin="anonymous" />
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Accommodation</span>
                                                            <h4 className="text-lg font-bold text-slate-900 mt-1">{hotelName}</h4>
                                                            <p className="text-xs text-slate-500 mt-0.5">{mealPlan}</p>
                                                            <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">{tier} Class • {roomTypeStr}</p>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-sm text-slate-400 italic py-2">No Accommodation Selected</div>
                                                )}
                                            </div>
                                        )}

                                        {sights.length > 0 ? (
                                            <div className="space-y-2 mt-1">
                                                {sights.map((s, i) => (
                                                    <div key={i} className="flex items-start gap-3">
                                                        <div className="w-16 h-12 rounded-md overflow-hidden shrink-0 border border-slate-200">
                                                            <img src={s.img} className="w-full h-full object-cover" crossOrigin="anonymous" />
                                                        </div>
                                                        <div>
                                                            <span className="text-sm font-bold text-slate-800 block">{s.name}</span>
                                                            <span className="text-xs text-slate-600 leading-snug">{s.desc}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            dayOverrides && dayOverrides.length === 0 && (
                                                <div className="text-xs text-slate-400 italic">No sightseeing included for this day.</div>
                                            )
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-slate-900 text-white p-8 mt-auto print:break-inside-avoid">
                    <div className="grid grid-cols-2 gap-12">
                        <div>
                            <h4 className="font-bold text-lg mb-4 border-b border-white/20 pb-2 text-emerald-400">Package Inclusions</h4>
                            <ul className="space-y-1.5 text-sm opacity-90">
                                {POLICY_DATA.inclusions.map((inc, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <span className="text-emerald-400 text-xs mt-1">●</span> {inc}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="flex flex-col justify-between items-end text-right">
                            <div className="space-y-1">
                                <h4 className="font-bold text-lg mb-4 border-b border-white/20 pb-2 text-slate-300 w-full text-right">Investment</h4>
                                <p className="text-xs uppercase tracking-wider opacity-60">Total Package Cost</p>
                                <p className="text-4xl font-bold text-emerald-400 font-serif tracking-tight">{formatCurrency(editorPricing.finalTotal)}</p>
                            </div>
                            
                            <div className="mt-4 bg-white/10 px-4 py-2 rounded-lg border border-white/10">
                                <p className="text-xs opacity-70">Cost Per Person</p>
                                <p className="text-xl font-bold text-white">{formatCurrency(editorPricing.perPerson)}</p>
                            </div>
                            
                            <p className="text-[10px] opacity-40 mt-4">Rates are subject to availability at the time of booking.</p>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export const KutchItineraryBuilder = () => {
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null);

  if (!selectedDestination) {
    return <DestinationGallery onSelect={setSelectedDestination} />;
  }

  if (selectedDestination === 'kutch') {
    return <KutchBuilder onBack={() => setSelectedDestination(null)} />;
  }

  return null;
};
