import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";

interface FilterProps {
  selectedCategories: string[];
  onCategoryChange: (categories: string[]) => void;
  priceRange: [number, number];
  onPriceRangeChange: (range: [number, number]) => void;
  freeShipping: boolean;
  onFreeShippingChange: (value: boolean) => void;
  onReset: () => void;
  maxPrice: number;
}

const CATEGORIES = [
  { value: "electronics", label: "Electronics" },
  { value: "fashion", label: "Fashion & Accessories" },
  { value: "home", label: "Home & Garden" },
  { value: "beauty", label: "Beauty & Health" },
  { value: "sports", label: "Sports & Outdoors" },
  { value: "toys", label: "Toys & Games" },
  { value: "other", label: "Other" },
];

export function ProductFilters({
  selectedCategories,
  onCategoryChange,
  priceRange,
  onPriceRangeChange,
  freeShipping,
  onFreeShippingChange,
  onReset,
  maxPrice,
}: FilterProps) {
  const handleCategoryToggle = (category: string) => {
    if (selectedCategories.includes(category)) {
      onCategoryChange(selectedCategories.filter((c) => c !== category));
    } else {
      onCategoryChange([...selectedCategories, category]);
    }
  };

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    priceRange[0] > 0 ||
    priceRange[1] < maxPrice ||
    freeShipping;

  return (
    <Sidebar className="border-r w-72">
      <SidebarContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Filters</h2>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-8 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear All
            </Button>
          )}
        </div>

        {/* Category Filter */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sm font-semibold mb-3">
            Category
          </SidebarGroupLabel>
          <SidebarGroupContent className="space-y-2">
            {CATEGORIES.map((category) => (
              <div key={category.value} className="flex items-center space-x-2">
                <Checkbox
                  id={category.value}
                  checked={selectedCategories.includes(category.value)}
                  onCheckedChange={() => handleCategoryToggle(category.value)}
                />
                <Label
                  htmlFor={category.value}
                  className="text-sm font-normal cursor-pointer"
                >
                  {category.label}
                </Label>
              </div>
            ))}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Price Range Filter */}
        <SidebarGroup className="mt-6">
          <SidebarGroupLabel className="text-sm font-semibold mb-3">
            Price Range (ETB)
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-4">
              <Slider
                min={0}
                max={maxPrice}
                step={100}
                value={priceRange}
                onValueChange={(value) =>
                  onPriceRangeChange(value as [number, number])
                }
                className="w-full"
              />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{priceRange[0].toLocaleString()} ETB</span>
                <span>{priceRange[1].toLocaleString()} ETB</span>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Free Shipping Filter */}
        <SidebarGroup className="mt-6">
          <SidebarGroupContent>
            <div className="flex items-center space-x-2 p-3 rounded-lg bg-accent/10 border border-accent">
              <Checkbox
                id="free-shipping"
                checked={freeShipping}
                onCheckedChange={onFreeShippingChange}
              />
              <Label
                htmlFor="free-shipping"
                className="text-sm font-medium cursor-pointer flex items-center gap-2"
              >
                <span className="text-success">✓</span> Free Shipping
              </Label>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
