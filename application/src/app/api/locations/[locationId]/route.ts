import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../../../prisma/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";
import { del } from "@vercel/blob";
import { DayOfWeek } from "@prisma/client";

export const dynamic = 'force-dynamic'

interface OperatingHour {
    day: DayOfWeek;
    openTime: string;
    closeTime: string;
}

// Define the order of the days numerically.
const dayOrder = {
    MONDAY: 0,
    TUESDAY: 1,
    WEDNESDAY: 2,
    THURSDAY: 3,
    FRIDAY: 4,
    SATURDAY: 5,
    SUNDAY: 6
};

/**
 * @Endpoint - GET /api/locations/{locationId}
 * @description - Fetches a single location from the database given a location id. 
 * @returns - a single location from the database.
 */
export async function GET(req: NextRequest, { params }: { params: { locationId: string } }) {
    try {
        const locationId = params.locationId;

        if (!locationId) {
            return NextResponse.json({ error: "No locationId provided." }, { status: 400 });
        }

        const location = await prisma.location.findUnique({
            where: {
                id: locationId
            },
            include: {
                gallery: {
                    select: {
                        images: true
                    }
                },
                operatingHours: {
                    select: {
                        day: true,
                        openTime: true,
                        closeTime: true
                    },
                }
            }
        });

        if (!location) {
            return NextResponse.json({ error: "Location not found." }, { status: 404 });
        }

        // Manually sort the operating hours by the numeric day order
        location.operatingHours.sort((a, b) => {
            return dayOrder[a.day] - dayOrder[b.day];
        });
        
        return NextResponse.json(location);
    } catch (error: any) {
        console.log(`[ERROR]: Error in GET of api/locations/[locationId]/route.ts: ${error}`);
        return NextResponse.json({ error: "Internal Server Error." }, { status: 500 });
    }
}

/**
 * @Auth - Required to be ADMIN
 * @Endpoint - DELETE /api/locations/{locationId}
 * @description - Deletes a single location from the database given a location id as well as the image in vercel blob.
 * @returns - The deleted location.
 */
export async function DELETE(req: NextRequest, { params }: { params: { locationId: string } }) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    try {
        const locationId = params.locationId;

        if (!locationId) {
            return NextResponse.json({ error: "No locationId provided." }, { status: 400 });
        }

        const location = await prisma.location.findFirst({
            where: {
                id: locationId
            },
            include: {
                gallery: {
                    select: {
                        images: true
                    }
                }
            }
        });

        if (!location) {
            return NextResponse.json({ error: "Location not found." }, { status: 404 });
        }

        const galleryImages = Array.isArray(location.gallery?.images)
            ? location.gallery?.images.filter((image): image is string => typeof image === 'string')
            : [];

        const imageUrls = Array.from(new Set([
            location.imageWebLink,
            ...galleryImages
        ])).filter((url): url is string => !!url && url !== "N/A");

        await Promise.allSettled(imageUrls.map((url) => del(url)));

        const deletedLocation = await prisma.location.delete({
            where: {
                id: locationId
            }
        });

        return NextResponse.json(deletedLocation);
    } catch (err: any) {
        console.log(`[ERROR]: Error in DELETE of api/locations/[locationId]/route.ts: ${err}`);
        return NextResponse.json({ error: "Internal Server Error." }, { status: 500 });
    }
}

/**
 * @Auth - Required to be ADMIN
 * @Endpoint - PATCH /api/locations/{locationId}
 * @description - Updates a single location from the database given a location id.
 * @returns - The updated location.
 */
export async function PATCH(req: NextRequest, { params }: { params: { locationId: string } }) {

    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    try {
        const locationId = params.locationId;

        if (!locationId) {
            return NextResponse.json({ error: "No locationId provided." }, { status: 400 });
        }

        const location = await prisma.location.findFirst({
            where: {
                id: locationId
            }
        });

        if (!location) {
            return NextResponse.json({ error: "Location not found." }, { status: 404 });
        }

        // all allowed fields that can be updated.
        const {
            name,
            address,
            phoneNumber,
            hasWifi,
            seatingCapacity,
            category,
            locationWebsiteLink,
            animalFriendliness,
            imageWebLink,
            latitude,
            longitude,
            operatingHours,
            galleryImages,
            deletedImages
        } = await req.json();

        // Check if any updatable field was provided.
        const hasAnyFieldToUpdate = [
            name,
            address,
            phoneNumber,
            hasWifi,
            seatingCapacity,
            category,
            locationWebsiteLink,
            animalFriendliness,
            imageWebLink,
            latitude,
            longitude,
            operatingHours,
            galleryImages,
            deletedImages
        ].some((value) => value !== undefined);

        if (!hasAnyFieldToUpdate) {
            return NextResponse.json({ error: "No fields provided to update." }, { status: 400 });
        }

        // ensure that address is unique
        if (address) {
            const existingLocation = await prisma.location.findFirst({
                where: {
                    address: address
                }
            });

            if (existingLocation && existingLocation.id !== locationId) {
                return NextResponse.json({ error: "Location with this address already exists." }, { status: 400 });
            }
        }

        // Update the location with the new fields.
        const updatedLocation = await prisma.location.update({
            where: {
                id: locationId
            },
            data: {
                name: name !== undefined ? name : location.name,
                address: address !== undefined ? address : location.address,
                phoneNumber: phoneNumber !== undefined ? phoneNumber : location.phoneNumber,
                hasWifi: hasWifi !== undefined ? hasWifi : location.hasWifi,
                seatingCapacity: seatingCapacity !== undefined ? seatingCapacity : location.seatingCapacity,
                category: category !== undefined ? category : location.category,
                locationWebsiteLink: locationWebsiteLink !== undefined ? locationWebsiteLink : location.locationWebsiteLink,
                animalFriendliness: animalFriendliness !== undefined ? animalFriendliness : location.animalFriendliness,
                imageWebLink: imageWebLink !== undefined ? imageWebLink : location.imageWebLink,
                latitude: latitude !== undefined ? latitude : location.latitude,
                longitude: longitude !== undefined ? longitude : location.longitude,
            }
        });

        // Update or create gallery images if provided.
        if (Array.isArray(galleryImages)) {
            const normalizedGalleryImages = galleryImages.filter((image): image is string => typeof image === 'string' && image.trim().length > 0);
            await prisma.locationGallery.upsert({
                where: {
                    locationId: locationId
                },
                create: {
                    locationId: locationId,
                    images: normalizedGalleryImages
                },
                update: {
                    images: normalizedGalleryImages
                }
            });
        }

        // Update the operating hours if they are provided.
        if (operatingHours && operatingHours.length > 0) {
            // delete all operating hours for the location
            await prisma.operatingHours.deleteMany({
                where: {
                    locationId: locationId
                }
            });

            // create new operating hours for the location in parallel
            const operatingHourPromises = operatingHours.map((operatingHour: OperatingHour) =>
                prisma.operatingHours.create({
                    data: {
                        day: operatingHour.day,
                        openTime: operatingHour.openTime,
                        closeTime: operatingHour.closeTime,
                        locationId: locationId
                    }
                })
            );

            // Wait for all operating hour creations to complete
            await Promise.all(operatingHourPromises);
        }

        // Delete requested images from blob storage.
        if (Array.isArray(deletedImages) && deletedImages.length > 0) {
            const normalizedDeletedImages = Array.from(new Set(
                deletedImages.filter((image): image is string => typeof image === 'string' && image.trim().length > 0 && image !== 'N/A')
            ));
            await Promise.allSettled(normalizedDeletedImages.map((url) => del(url)));
        }


        return NextResponse.json(updatedLocation);
    } catch (err: any) {
        console.log(`[ERROR]: Error in PATCH of api/locations/[locationId]/route.ts: ${err}`);
        return NextResponse.json({ error: "Internal Server Error." }, { status: 500 });
    }

}
