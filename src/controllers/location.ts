import { Request, Response } from "express";
import { GeoPoint } from "@google-cloud/firestore";
import { JournalService } from "@/services/journal.service";
import { EntryService } from "@/services/entry.service";
import { LocationHelper } from "@/utils/location.helper";
import { validateRequiredFields } from "@/utils/firestore.helper";
import { ILocation } from "@/types/global";
import _ from "lodash";

const locationController = {
  updateLocation: async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.apiError({
          status: 401,
          message: "Unauthorized",
          error: "Authentication required",
        });
      }

      if (!validateRequiredFields(req.body, ["coordinate"], res)) {
        return;
      }

      const { coordinate, place, street, city, region, country, value } =
        req.body;

      if (!validateRequiredFields(coordinate, ["latitude", "longitude"], res)) {
        return;
      }

      const { latitude, longitude } = coordinate;

      if (!LocationHelper.isValidCoordinate(latitude, longitude)) {
        return res.apiError({
          status: 400,
          message: "Invalid coordinates",
          error:
            "Latitude must be between -90 and 90, longitude between -180 and 180",
        });
      }

      const userId = req.user.id;
      const journalResult = await JournalService.getTodayJournal(userId);

      if (!journalResult.success || !journalResult.data) return;
      const locationData: Partial<ILocation> = {
        coordinate: new GeoPoint(latitude, longitude),
      };

      if (!_.isUndefined(place)) locationData.place = place;
      if (!_.isUndefined(street)) locationData.street = street;
      if (!_.isUndefined(city)) locationData.city = city;
      if (!_.isUndefined(region)) locationData.region = region;
      if (!_.isUndefined(country)) locationData.country = country;
      if (!_.isUndefined(value)) locationData.value = value;

      const entry = await EntryService.addOrUpdateEntry(
        journalResult.data.id!,
        locationData
      );

      return res.apiResponse(
        {
          status: 200,
          message: "Location updated successfully",
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
        }
      );
    } catch (error) {
      console.error("Update location error:", error);
      return res.apiError({
        status: 500,
        message: "Failed to update location",
        error: String(error),
      });
    }
  },

  getTodayStatus: async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.apiError({
          status: 401,
          message: "Unauthorized",
          error: "Authentication required",
        });
      }

      const userId = req.user.id;
      const journalResult = await JournalService.getTodayJournal(userId);

      if (!journalResult.success || !journalResult.data) {
        return res.apiResponse(
          {
            status: 200,
            message: "No journal found for today",
          },
          {
            journal: null,
            latestEntry: null,
          }
        );
      }

      const latestEntryResult = await EntryService.getLatestEntry(
        journalResult.data.id!
      );

      return res.apiResponse(
        {
          status: 200,
          message: "Today's status retrieved successfully",
        },
        {
          journal: journalResult.data,
          latestEntry:
            latestEntryResult.success && latestEntryResult.data
              ? latestEntryResult.data
              : null,
        }
      );
    } catch (error) {
      console.error("Get today status error:", error);
      return res.apiError({
        status: 500,
        message: "Failed to get today's status",
        error: String(error),
      });
    }
  },
};

export { locationController };
