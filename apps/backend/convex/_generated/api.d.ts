/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as backlog from "../backlog.js";
import type * as clerk from "../clerk.js";
import type * as comments from "../comments.js";
import type * as favorites from "../favorites.js";
import type * as feed from "../feed.js";
import type * as followers from "../followers.js";
import type * as franchiseMetadata from "../franchiseMetadata.js";
import type * as franchiseRanking from "../franchiseRanking.js";
import type * as friends from "../friends.js";
import type * as games from "../games.js";
import type * as igdb from "../igdb.js";
import type * as igdbTokens from "../igdbTokens.js";
import type * as lib_bandwidthMonitor from "../lib/bandwidthMonitor.js";
import type * as likes from "../likes.js";
import type * as migrations from "../migrations.js";
import type * as monitoring from "../monitoring.js";
import type * as reviews from "../reviews.js";
import type * as seedBatch from "../seedBatch.js";
import type * as seedFranchises from "../seedFranchises.js";
import type * as users from "../users.js";
import type * as utils_pagination from "../utils/pagination.js";
import type * as utils_queryCache from "../utils/queryCache.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  backlog: typeof backlog;
  clerk: typeof clerk;
  comments: typeof comments;
  favorites: typeof favorites;
  feed: typeof feed;
  followers: typeof followers;
  franchiseMetadata: typeof franchiseMetadata;
  franchiseRanking: typeof franchiseRanking;
  friends: typeof friends;
  games: typeof games;
  igdb: typeof igdb;
  igdbTokens: typeof igdbTokens;
  "lib/bandwidthMonitor": typeof lib_bandwidthMonitor;
  likes: typeof likes;
  migrations: typeof migrations;
  monitoring: typeof monitoring;
  reviews: typeof reviews;
  seedBatch: typeof seedBatch;
  seedFranchises: typeof seedFranchises;
  users: typeof users;
  "utils/pagination": typeof utils_pagination;
  "utils/queryCache": typeof utils_queryCache;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
