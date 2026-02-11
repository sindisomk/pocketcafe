 import { useQuery } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { queryKeys } from '@/lib/queryKeys';
 
 interface KioskStaff {
   id: string;
   name: string;
   profile_photo_url: string | null;
   role: string;
 }
 
 export function useKioskStaff() {
   const query = useQuery({
     queryKey: queryKeys.kioskStaff,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_profiles_manager')
        .select('id, name, profile_photo_url, role')
        .order('name');
       
       if (error) throw error;
       
       // Filter out any null id entries and cast types
       return (data ?? []).filter(s => s.id && s.name) as KioskStaff[];
     },
   });
 
   return {
     staff: query.data ?? [],
     isLoading: query.isLoading,
     isError: query.isError,
   };
 }