import {
  createAudioResource,
  StreamType,
  AudioPlayerStatus,
  createAudioPlayer,
  VoiceConnection,
  AudioPlayer,
} from "@discordjs/voice";
import { Readable } from "stream";
import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";

const players = new Map<string, AudioPlayer>();

export function playPCMBuffer(
  connection: VoiceConnection,
  pcmBuffer: Buffer
): Promise<void> {
  return new Promise((resolve, reject) => {
    const guildId = connection.joinConfig.guildId;
    let player = players.get(guildId);

    if (!player) {
      player = createAudioPlayer();
      players.set(guildId, player);
    }

    connection.subscribe(player);

    if (!ffmpegPath) {
      return reject(new Error("ffmpeg manual path not found"));
    }

    // FFmpeg conversion: 24kHz mono s16le -> 48kHz stereo s16le
    const ffmpeg = spawn(ffmpegPath, [
      "-f", "s16le",
      "-ar", "24000",
      "-ac", "1",
      "-i", "pipe:0",
      "-f", "s16le",
      "-ar", "48000",
      "-ac", "2",
      "pipe:1",
    ]);

    const pcmStream = new Readable();
    pcmStream.push(pcmBuffer);
    pcmStream.push(null);
    pcmStream.pipe(ffmpeg.stdin);

    const resource = createAudioResource(ffmpeg.stdout, {
      inputType: StreamType.Raw,
    });

    player.play(resource);

    const onIdle = () => {
      player?.removeListener(AudioPlayerStatus.Idle, onIdle);
      player?.removeListener("error", onError);
      resolve();
    };

    const onError = (error: Error) => {
      player?.removeListener(AudioPlayerStatus.Idle, onIdle);
      player?.removeListener("error", onError);
      reject(error);
    };

    player.once(AudioPlayerStatus.Idle, onIdle);
    player.once("error", onError);
  });
}
