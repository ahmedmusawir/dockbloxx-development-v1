"use client";

import React, { useState } from "react"; // Import useState and useEffect
import Image from "next/image";
import { getImageUrl } from "@/lib/utils";
import Page from "@/components/common/Page";
import FeaturedProducts from "@/components/common/FeaturedProducts";
import SearchControls from "@/components/search/SearchControls"; // Import the new component
import SpinnerLarge from "@/components/common/SpinnerLarge"; // Assuming you have this
import Head from "next/head";
import { Product } from "@/types/product";

// Props for SearchPageContent if it were to receive initial data from page.tsx
interface SearchPageContentProps {
  initialFeaturedProducts: Product[];
}

const SearchPageContent = ({
  initialFeaturedProducts,
}: SearchPageContentProps) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchPerformed, setSearchPerformed] = useState<boolean>(false);

  const handleSearch = async (searchTerm: string) => {
    console.log("Search submitted in SearchPageContent:", searchTerm);
    setIsLoading(true);
    setSearchPerformed(true); // Mark that a search has been initiated
    setSearchResults([]); // Clear previous results

    // Simulate API call for now
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate network delay

    // TODO: Replace with actual API call to fetch search results
    // For now, let's return an empty array or mock data
    const mockResults: Product[] = []; // Replace with actual fetch logic

    setSearchResults(mockResults);
    setIsLoading(false);
  };

  return (
    <>
      <Head>
        <title>Dockbloxx Product Search</title>
        <meta
          name="description"
          content="Custom dock accessories and solutions - Build your perfect dock setup with DockBloxx"
        />
      </Head>
      {/* Hero Section with Background Image - This part is fine */}
      <div className="relative h-[200px] md:h-[300px] w-full">
        {" "}
        {/* Adjusted height slightly */}
        <Image
          src={getImageUrl("/wp-content/uploads/header-img.jpg")} // Consider a search-specific banner
          alt="Product Search Background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
          <h1 className="text-4xl md:text-5xl text-white font-bold">
            Product Search
          </h1>
        </div>
      </div>

      <Page className="" FULL={false}>
        <div className="bg-white">
          <div className="mx-auto max-w-2xl px-2 py-4 sm:px-6 sm:py-2 md:max-w-7xl lg:max-w-7xl lg:px-1">
            {/* Section 1: Search Input Controls */}
            <div className="text-center mb-6">
              {" "}
              <SearchControls
                onSearchSubmit={handleSearch}
                isLoading={isLoading}
              />
            </div>

            {/* Section 2: Conditional Display - Spinner or Search Results */}
            <div className="text-center min-h-[10px] my-6">
              {" "}
              {/* Added min-height and margin */}
              {isLoading && (
                <div className="flex justify-center items-center py-10">
                  <SpinnerLarge />
                </div>
              )}
              {!isLoading && searchPerformed && (
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-2">
                    Search Results
                  </h2>
                  <hr className="mb-4" />
                  {searchResults.length > 0 ? (
                    <p>{searchResults.length} products found.</p> // Placeholder for SearchProductList
                  ) : (
                    // <SearchProductList products={searchResults} /> // TODO: Implement this
                    <p>No products found for your search.</p>
                  )}
                  {/* Pagination will go here later */}
                </div>
              )}
              {!isLoading &&
                !searchPerformed && ( // Initial state before any search
                  <div className="text-gray-500">
                    <p>Enter a product name above to start your search.</p>
                  </div>
                )}
            </div>

            {/* Section 3: Featured products - always visible below search/spinner */}
            {initialFeaturedProducts && initialFeaturedProducts.length > 0 && (
              <div className="border-t border-gray-200">
                {" "}
                {/* Added spacing and separator */}
                <FeaturedProducts featuredProducts={initialFeaturedProducts} />
              </div>
            )}
          </div>
        </div>
      </Page>
    </>
  );
};

export default SearchPageContent;
