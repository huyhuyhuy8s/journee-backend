import type {Request, Response} from 'express';
import * as JournalService from '@/services/journal.service';
import * as EntryService from '@/services/entry.service';
import * as LocationHelper from '@/utils/location.helper';
import {validateRequiredFields} from '@/utils/firestore.helper';
import type {ILocation} from '@/types/models';

export const updateLocation = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.apiError({
        status: 401,
        message: 'Unauthorized',
        error: 'Authentication required',
      });
    }

    if (!validateRequiredFields(req.body, ['coordinate'], res)) {
      return res.apiError({
        status: 400,
        message: 'Coordinate is required',
        error: 'Coordinate field is required',
      });
    }

    const {coordinate, place, street, city, region, country, value} =
      req.body;

    if (!validateRequiredFields(coordinate, ['latitude', 'longitude'], res)) {
      return res.apiError({
        status: 400,
        message: 'Coordinate is required',
        error: 'Coordinate field is required',
      });
    }

    const {latitude, longitude} = coordinate;

    if (!LocationHelper.isValidCoordinate(latitude, longitude)) {
      return res.apiError({
        status: 400,
        message: 'Invalid coordinates',
        error:
          'Latitude must be between -90 and 90, longitude between -180 and 180',
      });
    }

    const userId = req.user.id;
    const journalResult = await JournalService.getTodayJournal(userId);

    if (!journalResult.success || !journalResult.data) return;
    const locationData: Partial<ILocation> = {
      coordinate: {latitude, longitude},
    };

    if (!place) locationData.place = place;
    if (!street) locationData.street = street;
    if (!city) locationData.city = city;
    if (!region) locationData.region = region;
    if (!country) locationData.country = country;
    if (!value) locationData.value = value;

    const entry = await EntryService.addOrUpdateEntry(
      journalResult.data.id,
      locationData,
    );

    return res.apiResponse(
      {
        status: 200,
        message: 'Location updated successfully',
      },
      {
        journal: {
          id: journalResult.data.id,
          name: journalResult.data.name,
        },
        entry: {
          id: entry.id,
          name: entry.name,
          location: entry.location,
          arrivalTime: entry.arrivalTime,
          departureTime: entry.departureTime,
        },
      },
    );
  } catch (error) {
    console.error('Update location error:', error);
    return res.apiError({
      status: 500,
      message: 'Failed to update location',
      error: String(error),
    });
  }
};

