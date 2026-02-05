 import { useCallback, useRef, useState } from 'react';
 import { toast } from 'sonner';
 
 interface SearchResult {
   matched: boolean;
   staffId?: string;
   staffName?: string;
   staffPhoto?: string | null;
   confidence?: number;
   error?: string;
 }
 
 interface UseFaceSearchOptions {
   onMatch: (staffId: string, staffName: string, staffPhoto: string | null, confidence: number) => void;
   searchIntervalMs?: number;
   confidenceThreshold?: number;
 }
 
 export function useFaceSearch({ 
   onMatch, 
   searchIntervalMs = 2500,
   confidenceThreshold = 80 
 }: UseFaceSearchOptions) {
   const [isSearching, setIsSearching] = useState(false);
   const [lastSearchTime, setLastSearchTime] = useState(0);
   const [searchStatus, setSearchStatus] = useState<'idle' | 'scanning' | 'detected' | 'no-match'>('idle');
   const cooldownRef = useRef(false);
   const matchCooldownRef = useRef(false);
 
   const searchFace = useCallback(async (imageBase64: string): Promise<SearchResult | null> => {
     const now = Date.now();
     
     // Throttle searches
     if (now - lastSearchTime < searchIntervalMs || cooldownRef.current) {
       return null;
     }
 
     // Don't search if we recently found a match (give user time to interact)
     if (matchCooldownRef.current) {
       return null;
     }
 
     cooldownRef.current = true;
     setLastSearchTime(now);
     setIsSearching(true);
     setSearchStatus('scanning');
 
     try {
       const response = await fetch(
         `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/face-search`,
         {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
           },
           body: JSON.stringify({ imageBase64 }),
         }
       );
 
       const data: SearchResult = await response.json();
 
       if (data.matched && data.staffId && data.staffName && data.confidence) {
         setSearchStatus('detected');
         
         // Set match cooldown to prevent immediate re-detection
         matchCooldownRef.current = true;
         setTimeout(() => {
           matchCooldownRef.current = false;
         }, 5000);
 
         onMatch(data.staffId, data.staffName, data.staffPhoto ?? null, data.confidence);
         return data;
       } else {
         setSearchStatus('no-match');
         // Reset to idle after a short delay
         setTimeout(() => {
           setSearchStatus('idle');
         }, 1000);
         return data;
       }
 
     } catch (error) {
       console.error('[useFaceSearch] Error:', error);
       setSearchStatus('idle');
       return null;
     } finally {
       setIsSearching(false);
       cooldownRef.current = false;
     }
   }, [lastSearchTime, searchIntervalMs, onMatch]);
 
   const resetMatchCooldown = useCallback(() => {
     matchCooldownRef.current = false;
     setSearchStatus('idle');
   }, []);
 
   return {
     searchFace,
     isSearching,
     searchStatus,
     resetMatchCooldown,
   };
 }