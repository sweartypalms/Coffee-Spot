'use client';
import { useState, useEffect, useRef } from 'react';
import { DayOfWeek } from '@prisma/client';
import { useSession } from 'next-auth/react';
import Unauthorized from '../../../components/Unauthorized';
import useGetSpecificLocation from '../../../hooks/useGetSpecificLocation';
import useEditLocation from '../../../hooks/useEditLocation';
import Image from 'next/image';
import toast from 'react-hot-toast';

const normalizeGalleryImages = (images: unknown): string[] => {
    if (!Array.isArray(images)) return [];
    return images.filter((image): image is string => typeof image === 'string' && image.trim().length > 0);
};

const Page = ({ params }: { params: { locationId: string } }) => {
    const { data: session, status } = useSession();
    const { specificLocation, fetchSpecificLocation } = useGetSpecificLocation();
    const { editLocation, loading } = useEditLocation();
    const inputFileRef = useRef<HTMLInputElement>(null);
    const locationId = params.locationId;
    const [galleryImages, setGalleryImages] = useState<string[]>([]);
    const [deletedImages, setDeletedImages] = useState<string[]>([]);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phoneNumber: '',
        hasWifi: false,
        seatingCapacity: 0,
        category: '',
        animalFriendliness: false,
        locationWebsiteLink: '',
        imageWebLink: '',
        latitude: 0,
        longitude: 0,
        operatingHours: [
            { day: DayOfWeek.MONDAY, openTime: '', closeTime: '' },
            { day: DayOfWeek.TUESDAY, openTime: '', closeTime: '' },
            { day: DayOfWeek.WEDNESDAY, openTime: '', closeTime: '' },
            { day: DayOfWeek.THURSDAY, openTime: '', closeTime: '' },
            { day: DayOfWeek.FRIDAY, openTime: '', closeTime: '' },
            { day: DayOfWeek.SATURDAY, openTime: '', closeTime: '' },
            { day: DayOfWeek.SUNDAY, openTime: '', closeTime: '' }
        ]
    });

    // run once to fetch the specific location data
    useEffect(() => {
        fetchSpecificLocation(locationId)

        // DO NOT INCLUDE fetchSpecificLocation IN DEPENDENCIES | It will cause infinite loop
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locationId]); // Dependency on locationId to refetch when it changes

    // run once to set the form data as what we previously had
    useEffect(() => {
        if (specificLocation) {
            setFormData({
                name: specificLocation.name,
                address: specificLocation.address,
                phoneNumber: specificLocation.phoneNumber,
                hasWifi: specificLocation.hasWifi,
                seatingCapacity: specificLocation.seatingCapacity,
                category: specificLocation.category,
                animalFriendliness: specificLocation.animalFriendliness,
                locationWebsiteLink: specificLocation.locationWebsiteLink,
                imageWebLink: specificLocation.imageWebLink,
                latitude: specificLocation.latitude,
                longitude: specificLocation.longitude,
                operatingHours: specificLocation.operatingHours
            });

            const existingGalleryImages = normalizeGalleryImages(specificLocation.gallery?.images);
            if (existingGalleryImages.length > 0) {
                setGalleryImages(existingGalleryImages);
            } else if (specificLocation.imageWebLink && specificLocation.imageWebLink !== 'N/A') {
                setGalleryImages([specificLocation.imageWebLink]);
            } else {
                setGalleryImages([]);
            }

            setDeletedImages([]);
        }
    }, [specificLocation]); // Dependency on specificLocation to update form data

    const handleImageUpload = async (e: React.FormEvent<HTMLButtonElement>) => {
        e.preventDefault();
        try {
            if (!inputFileRef.current?.files || inputFileRef.current.files.length === 0) {
                throw new Error('Please choose an image first');
            }

            setUploadingImage(true);
            const file = inputFileRef.current.files[0];
            const response = await fetch(`/api/upload?filename=${file.name}`, {
                method: 'POST',
                body: file,
            });

            const newBlob = await response.json();
            if (newBlob.error) {
                throw new Error(newBlob.error);
            }

            setGalleryImages((previousImages) => [...previousImages, newBlob.url]);
            inputFileRef.current.value = '';
            toast.success('Image uploaded successfully');
        } catch (error: any) {
            toast.error(error.message ?? 'Failed to upload image');
        } finally {
            setUploadingImage(false);
        }
    };

    const handleRemoveImage = (imageUrl: string) => {
        setGalleryImages((previousImages) => previousImages.filter((image) => image !== imageUrl));
        setDeletedImages((previousDeletedImages) => (
            previousDeletedImages.includes(imageUrl)
                ? previousDeletedImages
                : [...previousDeletedImages, imageUrl]
        ));
    };

    // Prevent rendering if session is loading
    if (status === 'loading') return;

    // If the user is not authenticated or not an admin, show Unauthorized page
    if (status === 'unauthenticated' || session?.user.role !== 'ADMIN') {
        return <Unauthorized />;
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (galleryImages.length === 0) {
            toast.error('Please keep at least one image');
            return;
        }

        formData.seatingCapacity = Number(formData.seatingCapacity);
        await editLocation(locationId, {
            ...formData,
            imageWebLink: galleryImages[0],
            galleryImages,
            deletedImages
        }, session);
    };

    return (
        <div className="p-8 flex items-center justify-center min-h-screen" style={{ background: 'linear-gradient(to right, #FCE0D3, #E89CA8)' }}>
            <form
                onSubmit={handleSubmit}
                className="space-y-6 p-8 bg-white shadow-lg rounded-lg max-w-lg w-full"
                autoComplete='off'
            >
                <h2 className="text-3xl font-bold text-center text-gray-800">Edit Location Form</h2>

                <div className="space-y-4">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name:</label>
                    <input
                        type="text"
                        id="name"
                        className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-200"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                </div>

                <div className="space-y-4">
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">Address:</label>
                    <input
                        type="text"
                        id="address"
                        className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-200"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                </div>

                <div className="space-y-4">
                    <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">Phone Number:</label>
                    <input
                        type="text"
                        id="phoneNumber"
                        className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-200"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    />
                </div>

                <div className="space-y-4 flex items-center">
                    <label htmlFor="hasWifi" className="block text-sm font-medium text-gray-700">Has Wifi:</label>
                    <input
                        type="checkbox"
                        id="hasWifi"
                        className="ml-2 form-checkbox h-5 w-5 text-blue-600 transition duration-200"
                        checked={formData.hasWifi}
                        onChange={(e) => setFormData({ ...formData, hasWifi: e.target.checked })}
                    />
                </div>

                <div className="space-y-4">
                    <label htmlFor="seatingCapacity" className="block text-sm font-medium text-gray-700">Seating Capacity:</label>
                    <input
                        type="text"
                        id="seatingCapacity"
                        className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-200"
                        value={formData.seatingCapacity}
                        onChange={(e) => setFormData({ ...formData, seatingCapacity: Number(e.target.value) })}
                    />
                </div>

                <div className="space-y-4">
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category:</label>
                    <select
                        id="category"
                        className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-200"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                        <option value="">Select a category</option>
                        <option value="LIBRARY">Library</option>
                        <option value="CAFE">Cafe</option>
                        <option value="PARK">Park</option>
                    </select>
                </div>

                <div className="space-y-4 flex items-center">
                    <label htmlFor="animalFriendliness" className="block text-sm font-medium text-gray-700">Animal Friendliness:</label>
                    <input
                        type="checkbox"
                        id="animalFriendliness"
                        className="ml-2 form-checkbox h-5 w-5 text-blue-600 transition duration-200"
                        checked={formData.animalFriendliness}
                        onChange={(e) => setFormData({ ...formData, animalFriendliness: e.target.checked })}
                    />
                </div>

                <div className="space-y-4">
                    <label htmlFor="locationWebsiteLink" className="block text-sm font-medium text-gray-700">Location Website Link:</label>
                    <input
                        type="text"
                        id="locationWebsiteLink"
                        className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-200"
                        value={formData.locationWebsiteLink}
                        onChange={(e) => setFormData({ ...formData, locationWebsiteLink: e.target.value })}
                    />
                </div>

                <div className="space-y-4">
                    <h2 className="text-lg font-medium text-gray-800">Location Images:</h2>
                    <input
                        name="file"
                        ref={inputFileRef}
                        type="file"
                        accept="image/*"
                        className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-200"
                    />
                    <button
                        type="button"
                        onClick={handleImageUpload}
                        disabled={uploadingImage}
                        className={`w-full text-white p-3 rounded-md ${uploadingImage ? 'bg-blue-700 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
                    >
                        {uploadingImage ? 'Uploading Image...' : 'Upload Image'}
                    </button>
                    {galleryImages.length === 0 && (
                        <p className="text-sm text-gray-600">No images uploaded yet.</p>
                    )}
                    {galleryImages.length > 0 && (
                        <div className="grid grid-cols-2 gap-4">
                            {galleryImages.map((imageUrl, index) => (
                                <div key={imageUrl} className="border border-gray-200 rounded-md p-2">
                                    <Image
                                        src={imageUrl}
                                        alt={`Location image ${index + 1}`}
                                        width={240}
                                        height={180}
                                        className="w-full h-36 object-cover rounded-md"
                                    />
                                    {index === 0 && (
                                        <p className="text-xs text-gray-600 mt-2">Primary image</p>
                                    )}
                                    <button
                                        type="button"
                                        className="w-full mt-2 bg-red-500 text-white p-2 rounded-md hover:bg-red-600"
                                        onClick={() => handleRemoveImage(imageUrl)}
                                    >
                                        Delete Image
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <label htmlFor="latitude" className="block text-sm font-medium text-gray-700">Latitude:</label>
                    <input
                        type="number"
                        id="latitude"
                        className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-200"
                        value={formData.latitude}
                        onChange={(e) => setFormData({ ...formData, latitude: Number(e.target.value) })}
                    />
                    <label htmlFor="longitude" className="block text-sm font-medium text-gray-700">Longitude:</label>
                    <input
                        type="number"
                        id="longitude"
                        className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-200"
                        value={formData.longitude}
                        onChange={(e) => setFormData({ ...formData, longitude: Number(e.target.value) })}
                    />
                </div>

                <div className="space-y-4">
                    <h2 className="text-lg font-medium text-gray-800">Operating Hours:</h2>
                    <p className="text-sm text-gray-600">Leave time fields blank to indicate that the location is closed.</p>
                </div>

                {formData.operatingHours.map((operatingHour, index) => (
                    <div key={operatingHour.day} className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-800">{operatingHour.day}</h3>
                        <div className="space-y-4">
                            <label htmlFor={`openTime-${index}`} className="block text-sm font-medium text-gray-700">Open Time:</label>
                            <input
                                type="time"
                                id={`openTime-${index}`}
                                className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-200"
                                value={operatingHour.openTime}
                                onChange={(e) => {
                                    const newOperatingHours = [...formData.operatingHours];
                                    newOperatingHours[index].openTime = e.target.value;
                                    setFormData({ ...formData, operatingHours: newOperatingHours });
                                }}
                            />

                            <label htmlFor={`closeTime-${index}`} className="block text-sm font-medium text-gray-700">Close Time:</label>
                            <input
                                type="time"
                                id={`closeTime-${index}`}
                                className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-200"
                                value={operatingHour.closeTime}
                                onChange={(e) => {
                                    const newOperatingHours = [...formData.operatingHours];
                                    newOperatingHours[index].closeTime = e.target.value;
                                    setFormData({ ...formData, operatingHours: newOperatingHours });
                                }}
                            />
                        </div>
                    </div>
                ))}

                <button
                    type="submit"
                    className={`w-full bg-blue-500 text-white p-3 rounded-md hover:bg-blue-600 ${loading ? 'bg-blue-700 text-white cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                    disabled={loading}
                >
                    {loading ? 'Editing Location...' : 'Edit Location'}
                </button>
            </form>
        </div>
    );
};

export default Page;
