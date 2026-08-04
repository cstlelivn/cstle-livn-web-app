import { useState } from "react";
import { Search, Calendar as CalendarIcon, X, Filter, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { format } from "date-fns";

export interface FilterConfig {
  type: "text" | "date" | "select";
  field: string;
  label: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

export interface SortOption {
  field: string;
  label: string;
}

interface TableFilterProps {
  filters: FilterConfig[];
  onFilterChange: (filters: Record<string, any>) => void;
  searchPlaceholder?: string;
  sortOptions?: SortOption[];
  defaultSortBy?: string;
  defaultSortOrder?: "asc" | "desc";
}

export default function TableFilter({
  filters,
  onFilterChange,
  searchPlaceholder = "Search...",
  sortOptions = [],
  defaultSortBy = "",
  defaultSortOrder = "asc",
}: TableFilterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [selectValues, setSelectValues] = useState<Record<string, string>>({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<string>(defaultSortBy);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(defaultSortOrder);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    updateFilters({ search: value });
  };

  const handleDateFromChange = (date: Date | undefined) => {
    setDateFrom(date);
    updateFilters({ dateFrom: date });
  };

  const handleDateToChange = (date: Date | undefined) => {
    setDateTo(date);
    updateFilters({ dateTo: date });
  };

  const handleSelectChange = (field: string, value: string) => {
    const newSelectValues = { ...selectValues, [field]: value };
    setSelectValues(newSelectValues);
    updateFilters({ selects: newSelectValues });
  };

  const handleSortChange = (field: string) => {
    const newSortBy = field;
    const newSortOrder = sortBy === field && sortOrder === "asc" ? "desc" : "asc";
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    updateFilters({ sortBy: newSortBy, sortOrder: newSortOrder });
  };

  const toggleSortOrder = () => {
    const newOrder = sortOrder === "asc" ? "desc" : "asc";
    setSortOrder(newOrder);
    updateFilters({ sortOrder: newOrder });
  };

  const updateFilters = (changes: Partial<{
    search: string;
    dateFrom: Date | undefined;
    dateTo: Date | undefined;
    selects: Record<string, string>;
    sortBy: string;
    sortOrder: "asc" | "desc";
  }>) => {
    onFilterChange({
      search: changes.search !== undefined ? changes.search : searchQuery,
      dateFrom: changes.dateFrom !== undefined ? changes.dateFrom : dateFrom,
      dateTo: changes.dateTo !== undefined ? changes.dateTo : dateTo,
      selects: changes.selects !== undefined ? changes.selects : selectValues,
      sortBy: changes.sortBy !== undefined ? changes.sortBy : sortBy,
      sortOrder: changes.sortOrder !== undefined ? changes.sortOrder : sortOrder,
    });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setDateFrom(undefined);
    setDateTo(undefined);
    setSelectValues({});
    setSortBy(defaultSortBy);
    setSortOrder(defaultSortOrder);
    onFilterChange({ search: "", dateFrom: undefined, dateTo: undefined, selects: {}, sortBy: defaultSortBy, sortOrder: defaultSortOrder });
  };

  const hasActiveFilters = searchQuery || dateFrom || dateTo || Object.keys(selectValues).length > 0 || sortBy;

  const textFilters = filters.filter((f) => f.type === "text");
  const dateFilters = filters.filter((f) => f.type === "date");
  const selectFilters = filters.filter((f) => f.type === "select");

  return (
    <>
      {/* Search Input - Rendered separately */}
      {textFilters.length > 0 && (
        <div className="relative flex-1 max-w-[320px]">
          <Search className="absolute left-[8px] top-1/2 -translate-y-1/2 w-[12px] h-[12px] text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-[32px] pl-[28px] pr-[28px] bg-card border border-border rounded-[6px] font-['Roboto_Mono'] text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-[8px] top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-[12px] h-[12px]" />
            </button>
          )}
        </div>
      )}

      {/* Filter and Sort Controls - Rendered as separate component */}
      <div className="flex items-center gap-[6px]">
        {/* Sort Popover */}
        {sortOptions.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button 
                className="flex items-center justify-center h-[32px] w-[32px] bg-card border border-border rounded-[6px] hover:bg-accent/5 transition-colors relative"
                title="Sort"
              >
                <ArrowUpDown className="w-[14px] h-[14px] text-foreground" />
                {sortBy && (
                  <div className="absolute -top-[3px] -right-[3px] w-[6px] h-[6px] bg-accent rounded-full"></div>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-[12px] bg-card border border-border rounded-[8px]" align="end">
              <div className="space-y-[12px]">
                <div className="flex items-center justify-between">
                  <h3 className="font-['Roboto_Mono'] text-[11px] font-bold text-foreground">
                    Sort By
                  </h3>
                  {sortBy && (
                    <button
                      onClick={() => {
                        setSortBy(defaultSortBy);
                        setSortOrder(defaultSortOrder);
                        updateFilters({ sortBy: defaultSortBy, sortOrder: defaultSortOrder });
                      }}
                      className="font-['Roboto_Mono'] text-[9px] text-accent hover:text-accent/80 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="space-y-[6px]">
                  <Select value={sortBy || "none"} onValueChange={(value) => value !== "none" && handleSortChange(value)}>
                    <SelectTrigger className="w-full h-[30px] bg-background border border-border rounded-[4px] font-['Roboto_Mono'] text-[10px]">
                      <SelectValue placeholder="Select field..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {sortOptions.map((option) => (
                        <SelectItem key={option.field} value={option.field}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {sortBy && (
                  <div className="space-y-[6px]">
                    <label className="font-['Roboto_Mono'] text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                      Order
                    </label>
                    <div className="flex gap-[6px]">
                      <button
                        onClick={() => {
                          setSortOrder("asc");
                          updateFilters({ sortOrder: "asc" });
                        }}
                        className={`flex-1 flex items-center justify-center gap-[4px] h-[30px] px-[8px] border rounded-[4px] font-['Roboto_Mono'] text-[10px] transition-colors ${
                          sortOrder === "asc"
                            ? "bg-accent border-accent text-white"
                            : "bg-background border-border text-foreground hover:bg-accent/5"
                        }`}
                      >
                        <ArrowUp className="w-[10px] h-[10px]" />
                        Asc
                      </button>
                      <button
                        onClick={() => {
                          setSortOrder("desc");
                          updateFilters({ sortOrder: "desc" });
                        }}
                        className={`flex-1 flex items-center justify-center gap-[4px] h-[30px] px-[8px] border rounded-[4px] font-['Roboto_Mono'] text-[10px] transition-colors ${
                          sortOrder === "desc"
                            ? "bg-accent border-accent text-white"
                            : "bg-background border-border text-foreground hover:bg-accent/5"
                        }`}
                      >
                        <ArrowDown className="w-[10px] h-[10px]" />
                        Desc
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Advanced Filters Popover */}
        {(dateFilters.length > 0 || selectFilters.length > 0) && (
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <button 
                className="flex items-center justify-center h-[32px] w-[32px] bg-card border border-border rounded-[6px] hover:bg-accent/5 transition-colors relative"
                title="Filters"
              >
                <Filter className="w-[14px] h-[14px] text-foreground" />
                {(dateFrom || dateTo || Object.keys(selectValues).some(key => selectValues[key] && selectValues[key] !== "all")) && (
                  <div className="absolute -top-[3px] -right-[3px] w-[6px] h-[6px] bg-accent rounded-full"></div>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-[12px] bg-card border border-border rounded-[8px]" align="end">
              <div className="space-y-[12px]">
                <div className="flex items-center justify-between">
                  <h3 className="font-['Roboto_Mono'] text-[11px] font-bold text-foreground">
                    Filter Options
                  </h3>
                  {(dateFrom || dateTo || Object.keys(selectValues).length > 0) && (
                    <button
                      onClick={() => {
                        setDateFrom(undefined);
                        setDateTo(undefined);
                        setSelectValues({});
                        updateFilters({ dateFrom: undefined, dateTo: undefined, selects: {} });
                      }}
                      className="font-['Roboto_Mono'] text-[9px] text-accent hover:text-accent/80 transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {/* Date Range Filters */}
                {dateFilters.length > 0 && (
                  <div className="space-y-[8px]">
                    <p className="font-['Roboto_Mono'] text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                      Date Range
                    </p>
                    <div className="grid grid-cols-2 gap-[8px]">
                      <div>
                        <label className="font-['Roboto_Mono'] text-[9px] text-muted-foreground mb-[4px] block">
                          From
                        </label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="w-full h-[30px] px-[8px] bg-background border border-border rounded-[4px] font-['Roboto_Mono'] text-[10px] text-foreground hover:bg-accent/5 transition-colors flex items-center justify-between">
                              {dateFrom ? format(dateFrom, "MMM dd") : "Select"}
                              <CalendarIcon className="w-[10px] h-[10px] text-muted-foreground" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={dateFrom}
                              onSelect={handleDateFromChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <label className="font-['Roboto_Mono'] text-[9px] text-muted-foreground mb-[4px] block">
                          To
                        </label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="w-full h-[30px] px-[8px] bg-background border border-border rounded-[4px] font-['Roboto_Mono'] text-[10px] text-foreground hover:bg-accent/5 transition-colors flex items-center justify-between">
                              {dateTo ? format(dateTo, "MMM dd") : "Select"}
                              <CalendarIcon className="w-[10px] h-[10px] text-muted-foreground" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={dateTo}
                              onSelect={handleDateToChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                )}

                {/* Select Filters */}
                {selectFilters.map((filter) => (
                  <div key={filter.field} className="space-y-[6px]">
                    <label className="font-['Roboto_Mono'] text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                      {filter.label}
                    </label>
                    <Select
                      value={selectValues[filter.field] || "all"}
                      onValueChange={(value) => handleSelectChange(filter.field, value)}
                    >
                      <SelectTrigger className="w-full h-[30px] bg-background border border-border rounded-[4px] font-['Roboto_Mono'] text-[10px]">
                        <SelectValue placeholder={filter.placeholder || "Select..."} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {filter.options?.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Clear All Filters (visible when filters are active) */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center justify-center h-[32px] w-[32px] bg-accent/10 border border-accent/20 rounded-[6px] hover:bg-accent/20 transition-colors"
            title="Clear all filters and sorting"
          >
            <X className="w-[14px] h-[14px] text-accent" />
          </button>
        )}
      </div>
    </>
  );
}
