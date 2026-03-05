'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

type LocationImageGalleryProps = {
  images: string[];
  locationName: string;
};

function LocationImageGallery({ images, locationName }: LocationImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const hasImages = images.length > 0;

  const goToPrevious = () => {
    setActiveIndex((previous) => (previous - 1 + images.length) % images.length);
  };

  const goToNext = () => {
    setActiveIndex((previous) => (previous + 1) % images.length);
  };

  useEffect(() => {
    if (!isModalOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsModalOpen(false);
      }
      if (event.key === 'ArrowLeft') {
        goToPrevious();
      }
      if (event.key === 'ArrowRight') {
        goToNext();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isModalOpen, images.length]);

  if (!hasImages) {
    return (
      <div className="w-128 h-128 border-8 border-cherry-blossom-pink rounded-lg bg-slate-200 flex items-center justify-center text-stone-600">
        No images available
      </div>
    );
  }

  return (
    <>
      <section className="grid grid-flow-col gap-3">
        <div className="relative">
          <button
            type="button"
            onClick={goToPrevious}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/50 text-white w-9 h-9 text-xl hover:bg-black/70"
            aria-label="Previous image"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={goToNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/50 text-white w-9 h-9 text-xl hover:bg-black/70"
            aria-label="Next image"
          >
            ›
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="block"
            aria-label="Open image gallery"
          >
            <Image
              src={images[activeIndex]}
              width={512}
              height={512}
              alt={`${locationName} image ${activeIndex + 1}`}
              className="w-128 h-128 object-cover border-8 border-cherry-blossom-pink rounded-lg"
            />
          </button>
        </div>
      </section>

      {images.length > 1 && (
        <section className="mt-3 grid grid-cols-4 gap-2">
          {images.map((imageUrl, index) => (
            <button
              type="button"
              key={`${imageUrl}-${index}`}
              onClick={() => setActiveIndex(index)}
              className={`relative h-16 rounded-md overflow-hidden border-2 ${index === activeIndex ? 'border-rose-400' : 'border-transparent'}`}
              aria-label={`View image ${index + 1}`}
            >
              <Image src={imageUrl} alt={`${locationName} thumbnail ${index + 1}`} fill className="object-cover" />
            </button>
          ))}
        </section>
      )}

      {isModalOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setIsModalOpen(false)}
            className="absolute top-5 right-5 rounded-full bg-white/20 text-white w-10 h-10 text-2xl hover:bg-white/30"
            aria-label="Close gallery"
          >
            ×
          </button>
          <button
            type="button"
            onClick={goToPrevious}
            className="absolute left-4 md:left-10 rounded-full bg-white/20 text-white w-11 h-11 text-2xl hover:bg-white/30"
            aria-label="Previous image"
          >
            ‹
          </button>
          <div className="relative w-full max-w-5xl h-[70vh]">
            <Image
              src={images[activeIndex]}
              alt={`${locationName} full image ${activeIndex + 1}`}
              fill
              className="object-contain"
            />
          </div>
          <button
            type="button"
            onClick={goToNext}
            className="absolute right-4 md:right-10 rounded-full bg-white/20 text-white w-11 h-11 text-2xl hover:bg-white/30"
            aria-label="Next image"
          >
            ›
          </button>
        </div>
      )}
    </>
  );
}

export default LocationImageGallery;
