import { convertTimeToSeconds, getMediaSessionCover } from "../../../../utils/misc";
import { EventError, RatingSystem, Repeat, Site, StateMode } from "../../../types";
import { _throw, createDefaultControls, createSiteInfo, ratingUtils, setRepeat } from "../utils";

let playerApi: any = null;
let playerApiPromise: Promise<any> | null = null;

const initPlayer = () => {
  if (playerApi || playerApiPromise) return;

  const playerBar = document.querySelector<any>("ytmusic-player-bar");

  if (!playerBar?.resolvePlayerApi) return;

  playerApiPromise = playerBar
    .resolvePlayerApi()
    .then((api: any) => {
      playerApi = api;
    })
    .catch((error: any) => {
      console.error(
        "[WebNowPlaying] Failed to resolve YouTube Music Player API",
        error,
      );
      playerApiPromise = null;
    });
};

const getPlayer = () => {
  initPlayer();
  return playerApi;
};

const YouTubeMusic: Site = {
  debug: {
    getPlayer,
  },

  init: initPlayer,

  ready: () => {
    const player = getPlayer();
    return !!player?.isReady();
  },

  info: createSiteInfo({
    name: () => "YouTube Music",

    title: () => navigator.mediaSession.metadata?.title ?? "",

    artist: () => navigator.mediaSession.metadata?.artist ?? "",

    album: () => navigator.mediaSession.metadata?.album ?? "",

    cover: () => getMediaSessionCover().split("?")[0],

    state: () => {
      const state = getPlayer()?.getPlayerState();

      switch (state) {
        case 1:
          return StateMode.PLAYING;
        case 2:
          return StateMode.PAUSED;
        default:
          return StateMode.STOPPED;
      }
    },

    position: () => getPlayer()?.getCurrentTime() ?? 0,

    duration: () => {
      const timeInfo =
        document.querySelector<HTMLElement>(".time-info")?.innerText ??
        "0:00 / 0:00";

      const duration = timeInfo.trim().split(" / ")[1];

      return convertTimeToSeconds(duration);
    },

    volume: () => getPlayer()?.getVolume() ?? 100,

    rating: () => {
      const likeButtonPressed =
        document
          .querySelectorAll(".middle-controls-buttons yt-button-shape")[1]
          ?.getAttribute("aria-pressed") === "true";

      if (likeButtonPressed) return 5;

      const dislikeButtonPressed =
        document
          .querySelector(".middle-controls-buttons yt-button-shape")
          ?.getAttribute("aria-pressed") === "true";

      if (dislikeButtonPressed) return 1;

      return 0;
    },

    repeat: () => {
      const state =
        document
          .querySelector("ytmusic-player-bar")
          ?.getAttribute("repeat-mode");

      switch (state) {
        case "ONE":
          return Repeat.ONE;
        case "ALL":
          return Repeat.ALL;
        default:
          return Repeat.NONE;
      }
    },

    shuffle: () => false,
  }),

  events: {
    setState: (state) => {
      switch (state) {
        case StateMode.STOPPED:
          _throw(getPlayer()?.stopVideo)();
          break;
        case StateMode.PAUSED:
          _throw(getPlayer()?.pauseVideo)();
          break;
        case StateMode.PLAYING:
          _throw(getPlayer()?.playVideo)();
          break;
      }
    },

    skipPrevious: () => _throw(getPlayer()?.previousVideo)(),

    skipNext: () => _throw(getPlayer()?.nextVideo)(),

    setPosition: (seconds) =>
      _throw(getPlayer()?.seekTo)(seconds),

    setVolume: (volume) =>
      _throw(getPlayer()?.setVolume)(volume),

    setRating: (rating) => {
      ratingUtils.likeDislike(YouTubeMusic, rating, {
        toggleLike: () => {
          const button =
            document.querySelectorAll<HTMLButtonElement>(
              ".middle-controls-buttons button",
            )[1];

          if (!button) throw new EventError();

          button.click();
        },

        toggleDislike: () => {
          const button =
            document.querySelector<HTMLButtonElement>(
              ".middle-controls-buttons button",
            );

          if (!button) throw new EventError();

          button.click();
        },
      });
    },

    setRepeat: (repeat) => {
      const currentRepeat = YouTubeMusic.info.repeat();

      if (currentRepeat === repeat) return;

      const button =
        document.querySelector<HTMLButtonElement>(".repeat");

      if (!button) throw new EventError();

      const repeatMap = {
        [Repeat.NONE]: 0,
        [Repeat.ALL]: 1,
        [Repeat.ONE]: 2,
      };

      setRepeat(button, repeatMap, currentRepeat, repeat);
    },

    setShuffle: () => {
      const button =
        document.querySelector<HTMLButtonElement>(".shuffle");

      if (!button) throw new EventError();

      button.click();
    },
  },

  controls: () =>
    createDefaultControls(YouTubeMusic, {
      ratingSystem: RatingSystem.LIKE_DISLIKE,
      availableRepeat: Repeat.NONE | Repeat.ALL | Repeat.ONE,
    }),
};

export default YouTubeMusic;
