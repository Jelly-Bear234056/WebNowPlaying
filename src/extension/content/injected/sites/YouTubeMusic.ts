import { convertTimeToSeconds, getMediaSessionCover } from "../../../../utils/misc";
import { EventError, RatingSystem, Repeat, Site, StateMode } from "../../../types";
import {
  _throw,
  createDefaultControls,
  createSiteInfo,
  ratingUtils,
} from "../utils";

const getPlayer = () => {
  return document.querySelector<any>("#movie_player");
};

const YouTubeMusic: Site = {
  debug: {
    getPlayer,
  },

  init: () => {
    // YouTube Music now uses #movie_player instead of
    // ytmusic-player-bar / resolvePlayerApi.
  },

  ready: () => {
    return !!getPlayer();
  },

  info: createSiteInfo({
    name: () => "YouTube Music",

    title: () =>
      navigator.mediaSession.metadata?.title ??
      getPlayer()?.getVideoData?.()?.title ??
      "",

    artist: () =>
      navigator.mediaSession.metadata?.artist ?? "",

    album: () =>
      navigator.mediaSession.metadata?.album ?? "",

    cover: () =>
      getMediaSessionCover().split("?")[0],

    state: () => {
      const state = getPlayer()?.getPlayerState?.();

      switch (state) {
        case 1:
          return StateMode.PLAYING;

        case 2:
          return StateMode.PAUSED;

        default:
          return StateMode.STOPPED;
      }
    },

    position: () =>
      getPlayer()?.getCurrentTime?.() ?? 0,

    duration: () => {
      const player = getPlayer();

      // Prefer the player API if available.
      const playerDuration = player?.getDuration?.();

      if (typeof playerDuration === "number" && playerDuration > 0) {
        return playerDuration;
      }

      // Fallback to YouTube Music's time display.
      const timeInfo =
        document.querySelector<HTMLElement>(".time-info")?.innerText ??
        "0:00 / 0:00";

      const duration = timeInfo.trim().split(" / ")[1];

      return convertTimeToSeconds(duration);
    },

    volume: () =>
      getPlayer()?.getVolume?.() ?? 100,

    rating: () => {
      const likeButtonPressed =
        document
          .querySelectorAll(".middle-controls-buttons yt-button-shape")[1]
          ?.getAttribute("aria-pressed") === "true";

      if (likeButtonPressed) {
        return 5;
      }

      const dislikeButtonPressed =
        document
          .querySelector(".middle-controls-buttons yt-button-shape")
          ?.getAttribute("aria-pressed") === "true";

      if (dislikeButtonPressed) {
        return 1;
      }

      return 0;
    },

    repeat: () => {
      // Repeat state is currently unavailable from the new
      // YouTube Music player API.
      return Repeat.NONE;
    },

    shuffle: () => false,
  }),

  events: {
    setState: (state) => {
      const player = getPlayer();

      switch (state) {
        case StateMode.STOPPED:
          _throw(player?.stopVideo)();
          break;

        case StateMode.PAUSED:
          _throw(player?.pauseVideo)();
          break;

        case StateMode.PLAYING:
          _throw(player?.playVideo)();
          break;
      }
    },

    skipPrevious: () => {
      _throw(getPlayer()?.previousVideo)();
    },

    skipNext: () => {
      _throw(getPlayer()?.nextVideo)();
    },

    setPosition: (seconds) => {
      const player = getPlayer();

      if (typeof player?.seekToStreamTime === "function") {
        player.seekToStreamTime(seconds);
        return;
      }

      if (typeof player?.seekTo === "function") {
        player.seekTo(seconds);
        return;
      }

      throw new EventError();
    },

    setVolume: (volume) => {
      _throw(getPlayer()?.setVolume)(volume);
    },

    setRating: (rating) => {
      ratingUtils.likeDislike(YouTubeMusic, rating, {
        toggleLike: () => {
          const button =
            document.querySelectorAll<HTMLButtonElement>(
              ".middle-controls-buttons button",
            )[1];

          if (!button) {
            throw new EventError();
          }

          button.click();
        },

        toggleDislike: () => {
          const button =
            document.querySelector<HTMLButtonElement>(
              ".middle-controls-buttons button",
            );

          if (!button) {
            throw new EventError();
          }

          button.click();
        },
      });
    },

    setRepeat: () => {
      throw new EventError();
    },

    setShuffle: () => {
      const button =
        document.querySelector<HTMLButtonElement>(".shuffle");

      if (!button) {
        throw new EventError();
      }

      button.click();
    },
  },

  controls: () =>
    createDefaultControls(YouTubeMusic, {
      ratingSystem: RatingSystem.LIKE_DISLIKE,
      availableRepeat: Repeat.NONE,
    }),
};

export default YouTubeMusic;
