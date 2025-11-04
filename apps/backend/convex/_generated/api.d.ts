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
import type * as franchiseRanking from "../franchiseRanking.js";
import type * as friends from "../friends.js";
import type * as games from "../games.js";
import type * as igdb from "../igdb.js";
import type * as igdbTokens from "../igdbTokens.js";
import type * as likes from "../likes.js";
import type * as reviews from "../reviews.js";
import type * as users from "../users.js";

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
  franchiseRanking: typeof franchiseRanking;
  friends: typeof friends;
  games: typeof games;
  igdb: typeof igdb;
  igdbTokens: typeof igdbTokens;
  likes: typeof likes;
  reviews: typeof reviews;
  users: typeof users;
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
