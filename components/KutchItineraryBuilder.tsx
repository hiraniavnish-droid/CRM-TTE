
import React, { useState, useMemo, useEffect } from 'react';
import { generateId, useRoomCalculator } from '../utils/helpers';
import { PageLoader } from './ui/PageLoader';
import { Hotel, ItineraryPackage, RoomType, Vehicle, Sightseeing } from '../types';
import { DestinationGallery } from './DestinationGallery';
import { useItineraryData } from '../hooks/useItineraryData';

// Modular Imports
import { ItineraryHeader } from './itinerary/ItineraryHeader';
import { GalleryView } from './itinerary/GalleryView';
import { PricingControlDeck } from './itinerary/PricingControlDeck';
import { TimelineView } from './itinerary/TimelineView';
import { CustomBuilder } from './itinerary/CustomBuilder';
import { FleetManager } from './itinerary/FleetManager';
import { HotelSwapModal } from './itinerary/HotelSwapModal';
import { ItineraryPdfTemplate } from './itinerary/ItineraryPdfTemplate';
import { FleetItem, CustomDay } from './itinerary/types';
import { FALLBACK_IMG } from './itinerary/utils';

// --- MAIN COMPONENT ---

const KutchBuilder: React.FC<{ 
    onBack: () => void;
    hotelData: Record<string, Hotel[]>;
    sightseeingData: Record<string, Sightseeing[]>;
    vehicleData: Vehicle[];
    packages: ItineraryPackage[];
}> = ({ onBack, hotelData, sightseeingData, vehicleData, packages }) => {
  
  // --- STATE ---
  const [view, setView] = useState<'gallery' | 'editor' | 'custom_builder'>('gallery');
  const [pax, setPax] = useState(2);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [guestName, setGuestName] = useState('Guest');
  const [gallerySharingMode, setGallerySharingMode] = useState<'Double' | 'Quad'>('Double');
  const [selectedPkgId, setSelectedPkgId] = useState<string | null>(null);
  const [baseTier, setBaseTier] = useState<'Budget' | 'Premium'>('Budget');
  const [hotelOverrides, setHotelOverrides] = useState<Record<number, { hotel: Hotel, roomType: RoomType }>>({}); 
  const [sightseeingOverrides, setSightseeingOverrides] = useState<Record<number, string[]>>({}); 
  const [customPackage, setCustomPackage] = useState<ItineraryPackage | null>(null);
  const [fleet, setFleet] = useState<FleetItem[]>([]);
  const [isManualFleet, setIsManualFleet] = useState(false); 
  const [isFleetModalOpen, setIsFleetModalOpen] = useState(false);
  const [markupType, setMarkupType] = useState<'percent' | 'fixed'>('percent');
  const [markupValue, setMarkupValue] = useState<number>(0);
  const [swapModal, setSwapModal] = useState<{ dayIndex: number; city: string } | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  // --- FLEET AUTO-CALCULATION ---
  useEffect(() => {
      if (!isManualFleet) {
          const autoFleet: FleetItem[] = [];
          const id = generateId();
          if (pax <= 4) { autoFleet.push({ id, name: 'Sedan (Dzire)', count: 1 }); } 
          else if (pax <= 6) { autoFleet.push({ id, name: 'Innova', count: 1 }); } 
          else if (pax <= 12) { autoFleet.push({ id, name: 'Tempo Traveller', count: 1 }); } 
          else { autoFleet.push({ id, name: 'Tempo Traveller', count: Math.ceil(pax / 12) }); }
          setFleet(autoFleet);
      }
  }, [pax, isManualFleet]);

  // --- PRICING LOGIC ---
  const calculatePrice = (pkg: ItineraryPackage, tier: 'Budget' | 'Premium', overrides: Record<number, { hotel: Hotel, roomType: RoomType }> = {}) => {
      let transportCost = 0;
      fleet.forEach(item => {
          const vData = vehicleData.find(v => v.name === item.name);
          if (vData) transportCost += (vData.rate * item.count * pkg.days);
      });
      let hotelCost = 0;
      pkg.route.forEach((city, index) => {
          let override = overrides[index];
          let rate = 0;
          let capacity = 2; 
          if (override) {
              rate = override.roomType.rate;
              capacity = override.roomType.capacity;
          } else {
              const cityHotels = hotelData[city] || [];
              const hotel = cityHotels.find(h => h.tier === tier) || cityHotels[0];
              if (hotel) {
                  rate = hotel.roomTypes[0]?.rate || 0;
                  capacity = hotel.roomTypes[0]?.capacity || 2;
              }
          }
          const roomsNeeded = useRoomCalculator(pax, capacity);
          hotelCost += (rate * roomsNeeded);
      });
      const netTotal = transportCost + hotelCost;
      return { netTotal, perPerson: pax > 0 ? Math.round(netTotal / pax) : 0 };
  };

  const activePackage = selectedPkgId === 'custom' ? customPackage : packages.find(p => p.id === selectedPkgId);

  const editorPricing = useMemo(() => {
      if (!activePackage) return null;
      const { netTotal } = calculatePrice(activePackage, baseTier, hotelOverrides);
      let finalTotal = netTotal;
      if (markupType === 'percent') finalTotal = netTotal * (1 + markupValue / 100);
      else finalTotal = netTotal + markupValue;
      return { netTotal, finalTotal, perPerson: pax > 0 ? Math.round(finalTotal / pax) : 0 };
  }, [activePackage, baseTier, hotelOverrides, fleet, pax, markupType, markupValue, vehicleData]);

  // --- HANDLERS ---
  const handleAddVehicle = () => { setIsManualFleet(true); setFleet([...fleet, { id: generateId(), name: 'Sedan (Dzire)', count: 1 }]); };
  const handleRemoveVehicle = (id: string) => { setIsManualFleet(true); setFleet(fleet.filter(f => f.id !== id)); };
  const handleUpdateVehicle = (id: string, field: 'name' | 'count', value: any) => { setIsManualFleet(true); setFleet(fleet.map(f => f.id === id ? { ...f, [field]: value } : f)); };
  
  const handleSelectPackage = (pkgId: string, tier: 'Budget' | 'Premium') => { 
      setSelectedPkgId(pkgId); 
      setBaseTier(tier); 
      setHotelOverrides({}); 
      setSightseeingOverrides({}); 
      setMarkupValue(0); 
      setView('editor'); 
  };
  
  const handleUpdateRoomType = (dayIndex: number, hotel: Hotel, roomType: RoomType) => { 
      setHotelOverrides(prev => ({ ...prev, [dayIndex]: { hotel, roomType } })); 
  };
  
  const handleCustomComplete = (days: CustomDay[]) => {
      const newCustomPkg: ItineraryPackage = {
          id: 'custom',
          name: 'Your Custom Journey',
          img: FALLBACK_IMG,
          days: days.length,
          route: days.map(d => d.city)
      };
      const newHotelOverrides: Record<number, { hotel: Hotel, roomType: RoomType }> = {};
      const newSightseeingOverrides: Record<number, string[]> = {};
      days.forEach((day, idx) => {
          if (day.hotel && day.selectedRoomType) newHotelOverrides[idx] = { hotel: day.hotel, roomType: day.selectedRoomType };
          newSightseeingOverrides[idx] = day.sightseeing || [];
      });
      setCustomPackage(newCustomPkg); 
      setHotelOverrides(newHotelOverrides); 
      setSightseeingOverrides(newSightseeingOverrides); 
      setSelectedPkgId('custom'); 
      setView('editor');
  };

  // --- ACTION HANDLERS ---
  const handleCopyQuotation = () => { setCopyFeedback(true); setTimeout(() => setCopyFeedback(false), 2000); };
  
  const handleDownloadPdf = async () => { 
      setIsPdfLoading(true); 
      
      try {
          // 1. Lazy load heavy libraries
          const html2canvas = (await import('html2canvas')).default;
          const { jsPDF } = await import('jspdf');

          // 2. Identify the hidden template container
          const templateContainer = document.getElementById('pdf-template-container');
          if (!templateContainer) throw new Error("PDF Template container not found");

          // 3. Find all "Logical Blocks" (Sections)
          const sections = templateContainer.querySelectorAll('.pdf-section');
          if (sections.length === 0) throw new Error("No sections found to generate");

          // 4. Initialize PDF (A4 Portrait: 210mm x 297mm)
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
          const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
          
          let currentY = 0;

          // 5. Smart Loop: Capture each section and place it
          for (let i = 0; i < sections.length; i++) {
              const section = sections[i] as HTMLElement;
              
              // Capture specific section
              const canvas = await html2canvas(section, {
                  scale: 2, // High res
                  useCORS: true,
                  logging: false,
                  backgroundColor: '#ffffff'
              });

              const imgData = canvas.toDataURL('image/png');
              const imgHeight = (canvas.height * pdfWidth) / canvas.width;

              // 6. Pagination Logic
              if (currentY + imgHeight > pdfHeight && i > 0) {
                  pdf.addPage();
                  currentY = 0; 
              }

              pdf.addImage(imgData, 'PNG', 0, currentY, pdfWidth, imgHeight);
              currentY += imgHeight;
          }

          // 7. Save with Dynamic Name
          const safeName = guestName.replace(/[^a-zA-Z0-9]/g, '_');
          pdf.save(`${safeName}_Kutch_Itinerary_${pax}Pax.pdf`);

      } catch (err) {
          console.error("PDF Generation Error", err);
          alert("Could not generate PDF. Please try again or check console.");
      } finally {
          setIsPdfLoading(false);
      }
  };

  return (
    // Changed to absolute to fit within the Layout's <main> container (right of sidebar)
    <div className="absolute inset-0 bg-slate-50 flex flex-col overflow-hidden animate-in fade-in duration-300">
        
        {/* --- VIEW 1: GALLERY --- */}
        {view === 'gallery' && (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
                <div className="max-w-7xl mx-auto space-y-8">
                    <ItineraryHeader 
                        startDate={startDate} setStartDate={setStartDate}
                        pax={pax} setPax={setPax}
                        fleet={fleet} onOpenFleetModal={() => setIsFleetModalOpen(true)}
                        guestName={guestName} setGuestName={setGuestName}
                        onBack={onBack}
                        onUpdateRates={() => {}}
                    />

                    <GalleryView 
                        packages={packages}
                        pax={pax}
                        gallerySharingMode={gallerySharingMode}
                        setGallerySharingMode={setGallerySharingMode}
                        onSelectPackage={handleSelectPackage}
                        onOpenCustomBuilder={() => setView('custom_builder')}
                        hotelData={hotelData}
                    />
                </div>
            </div>
        )}

        {/* --- VIEW 3: CUSTOM BUILDER (ABSOLUTE OVERLAY) --- */}
        {view === 'custom_builder' && (
            <CustomBuilder 
                onCancel={() => setView('gallery')}
                onComplete={handleCustomComplete}
                guestName={guestName} setGuestName={setGuestName}
                pax={pax} setPax={setPax}
                startDate={startDate} setStartDate={setStartDate}
                fleet={fleet} onOpenFleetModal={() => setIsFleetModalOpen(true)}
                hotelData={hotelData}
                sightseeingData={sightseeingData}
                vehicleData={vehicleData}
            />
        )}

        {/* --- VIEW 2: EDITOR --- */}
        {view === 'editor' && activePackage && editorPricing && (
            <div className="flex flex-col h-full">
                <div className="shrink-0 z-30 shadow-sm relative bg-slate-50">
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
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 pb-32 bg-slate-50/50">
                    <div className="max-w-5xl mx-auto">
                        <TimelineView 
                            activePackage={activePackage}
                            startDate={startDate}
                            pax={pax}
                            fleet={fleet}
                            hotelOverrides={hotelOverrides}
                            sightseeingOverrides={sightseeingOverrides}
                            baseTier={baseTier}
                            onSwapHotel={(dayIndex, city) => setSwapModal({ dayIndex, city })}
                            onUpdateRoomType={handleUpdateRoomType}
                            onOpenFleetModal={() => setIsFleetModalOpen(true)}
                            hotelData={hotelData}
                            sightseeingData={sightseeingData}
                            vehicleData={vehicleData}
                        />
                    </div>
                </div>
            </div>
        )}

        <FleetManager 
            isOpen={isFleetModalOpen} 
            onClose={() => setIsFleetModalOpen(false)}
            fleet={fleet}
            onAddVehicle={handleAddVehicle}
            onRemoveVehicle={handleRemoveVehicle}
            onUpdateVehicle={handleUpdateVehicle}
            vehicleData={vehicleData}
        />

        {swapModal && (
            <HotelSwapModal 
                isOpen={!!swapModal} 
                onClose={() => setSwapModal(null)} 
                city={swapModal.city}
                dayIndex={swapModal.dayIndex}
                hotels={hotelData[swapModal.city] || []}
                onSelect={handleUpdateRoomType}
            />
        )}

        {/* Hidden PDF Render Container - Positioned off-screen */}
        {activePackage && editorPricing && (
            <ItineraryPdfTemplate 
                guestName={guestName}
                pax={pax}
                activePackage={activePackage}
                pricing={editorPricing}
                startDate={startDate}
                hotelOverrides={hotelOverrides}
                hotelData={hotelData}
                baseTier={baseTier}
                fleet={fleet}
                sightseeingOverrides={sightseeingOverrides}
                sightseeingData={sightseeingData}
            />
        )}

    </div>
  );
};

export const KutchItineraryBuilder = () => {
  const { hotelData, sightseeingData, vehicleData, packages, loading, error } = useItineraryData('kutch');
  const [selectedDest, setSelectedDest] = useState<string | null>(null);

  if (loading) return <PageLoader />;
  if (error) return <div className="p-10 text-center text-red-500">Error loading data: {error}</div>;

  if (!selectedDest) {
    return <DestinationGallery onSelect={setSelectedDest} />;
  }

  return (
    <KutchBuilder
      onBack={() => setSelectedDest(null)}
      hotelData={hotelData}
      sightseeingData={sightseeingData}
      vehicleData={vehicleData}
      packages={packages}
    />
  );
};
