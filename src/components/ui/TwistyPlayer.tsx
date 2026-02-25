import { useRef, useEffect } from 'react';

interface TwistyPlayerProps {
  algorithm: string;
  puzzle?: string;
  setupAlg?: string;
  stickering?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function TwistyPlayer({
  algorithm,
  puzzle = '3x3x3',
  setupAlg,
  stickering,
  className,
  style,
}: TwistyPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    (async () => {
      const [{ TwistyPlayer: TP }, { Alg }] = await Promise.all([
        import('cubing/twisty'),
        import('cubing/alg'),
      ]);
      if (cancelled) return;

      // Remove previous player
      if (playerRef.current) {
        playerRef.current.remove();
        playerRef.current = null;
      }

      // When no explicit setup alg, invert the algorithm so the player
      // starts showing the unsolved case and plays the algo to solve it.
      const effectiveSetup = setupAlg || new Alg(algorithm).invert().toString();

      const player = new TP({
        puzzle,
        alg: algorithm,
        experimentalSetupAlg: effectiveSetup,
        ...(stickering
          ? { experimentalStickering: stickering as any }
          : {}),
        hintFacelets: 'floating',
        background: 'none',
        controlPanel: 'bottom-row',
        visualization: '3D',
      });

      // Style the custom element to fill its container
      player.style.width = '100%';
      player.style.height = '100%';

      container.appendChild(player);
      playerRef.current = player;
    })();

    return () => {
      cancelled = true;
      if (playerRef.current) {
        playerRef.current.remove();
        playerRef.current = null;
      }
    };
  }, [algorithm, puzzle, setupAlg, stickering]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ minHeight: 200, ...style }}
    />
  );
}
