import { useState, useMemo } from 'react';
import { Search, Plus, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StaffCard } from './StaffCard';
import { StaffCardSkeleton } from './StaffCardSkeleton';
import { StaffDetailSheet } from './StaffDetailSheet';
import { useStaff } from '@/hooks/useStaff';
import { useAuth } from '@/hooks/useAuth';
import { StaffProfile } from '@/types/staff';

export function StaffDirectory() {
  const { staff, isLoading, isError } = useStaff();
  const { isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<StaffProfile | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const filteredStaff = useMemo(() => {
    if (!searchQuery.trim()) return staff;
    
    const query = searchQuery.toLowerCase();
    return staff.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.role.toLowerCase().includes(query)
    );
  }, [staff, searchQuery]);

  const handleStaffClick = (staffMember: StaffProfile) => {
    setSelectedStaff(staffMember);
    setSheetOpen(true);
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-destructive/10 p-4 mb-4">
          <Users className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Unable to load staff</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Please check your permissions or try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Staff Directory</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {staff.length} team member{staff.length !== 1 ? 's' : ''}
          </p>
        </div>

        {isAdmin && (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Staff
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or role..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Staff Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <StaffCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            {searchQuery ? 'No matching staff found' : 'No staff members yet'}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {searchQuery
              ? 'Try adjusting your search terms'
              : 'Add your first team member to get started'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredStaff.map((staffMember) => (
            <StaffCard
              key={staffMember.id}
              staff={staffMember}
              onClick={() => handleStaffClick(staffMember)}
            />
          ))}
        </div>
      )}

      {/* Detail Sheet */}
      <StaffDetailSheet
        staff={selectedStaff}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
