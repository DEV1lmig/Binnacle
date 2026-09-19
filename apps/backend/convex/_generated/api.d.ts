/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as articleComments from "../articleComments.js";
import type * as articleLikes from "../articleLikes.js";
import type * as articles from "../articles.js";
import type * as backlog from "../backlog.js";
import type * as blocking from "../blocking.js";
import type * as catalogSync from "../catalogSync.js";
import type * as clerk from "../clerk.js";
import type * as comments from "../comments.js";
import type * as crons from "../crons.js";
import type * as favorites from "../favorites.js";
import type * as feed from "../feed.js";
import type * as followers from "../followers.js";
import type * as franchiseMetadata from "../franchiseMetadata.js";
import type * as franchiseRanking from "../franchiseRanking.js";
import type * as friends from "../friends.js";
import type * as games from "../games.js";
import type * as http from "../http.js";
import type * as igdb from "../igdb.js";
import type * as igdbTokens from "../igdbTokens.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_bandwidthMonitor from "../lib/bandwidthMonitor.js";
import type * as lib_igdbSync from "../lib/igdbSync.js";
import type * as likes from "../likes.js";
import type * as migrations from "../migrations.js";
import type * as moderation from "../moderation.js";
import type * as monitoring from "../monitoring.js";
import type * as notifications from "../notifications.js";
import type * as privacy from "../privacy.js";
import type * as reports from "../reports.js";
import type * as reviews from "../reviews.js";
import type * as seedBatch from "../seedBatch.js";
import type * as seedFranchises from "../seedFranchises.js";
import type * as settings from "../settings.js";
import type * as syncHttp from "../syncHttp.js";
import type * as syncJobs from "../syncJobs.js";
import type * as users from "../users.js";
import type * as utils_pagination from "../utils/pagination.js";
import type * as utils_queryCache from "../utils/queryCache.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  articleComments: typeof articleComments;
  articleLikes: typeof articleLikes;
  articles: typeof articles;
  backlog: typeof backlog;
  blocking: typeof blocking;
  catalogSync: typeof catalogSync;
  clerk: typeof clerk;
  comments: typeof comments;
  crons: typeof crons;
  favorites: typeof favorites;
  feed: typeof feed;
  followers: typeof followers;
  franchiseMetadata: typeof franchiseMetadata;
  franchiseRanking: typeof franchiseRanking;
  friends: typeof friends;
  games: typeof games;
  http: typeof http;
  igdb: typeof igdb;
  igdbTokens: typeof igdbTokens;
  "lib/auth": typeof lib_auth;
  "lib/bandwidthMonitor": typeof lib_bandwidthMonitor;
  "lib/igdbSync": typeof lib_igdbSync;
  likes: typeof likes;
  migrations: typeof migrations;
  moderation: typeof moderation;
  monitoring: typeof monitoring;
  notifications: typeof notifications;
  privacy: typeof privacy;
  reports: typeof reports;
  reviews: typeof reviews;
  seedBatch: typeof seedBatch;
  seedFranchises: typeof seedFranchises;
  settings: typeof settings;
  syncHttp: typeof syncHttp;
  syncJobs: typeof syncJobs;
  users: typeof users;
  "utils/pagination": typeof utils_pagination;
  "utils/queryCache": typeof utils_queryCache;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
