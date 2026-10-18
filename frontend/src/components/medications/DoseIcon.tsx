// OWNER: Member 2 - one icon per administration route, coloured by the pack's --mint/--mint-deep/--mint-light.
// Each plays its animation when its blister cell gets the `is-taking` class (see globals.css "Dose icons").
// Everything, including the puff, squirt and cream, stays inside the 24x24 bubble (radius ~11.5 from the centre).
import type { Route } from "@/lib/route";
import { Tablet } from "@/components/ui/pz";
import { cn } from "@/lib/utils";

export function DoseIcon({ route, className }: { route: Route; className?: string }) {
  const cls = cn("pz-tab pz-dose-icon", `pz-dose-icon--${route}`, className);
  if (route === "enteral") return <Tablet className={cls} />;

  if (route === "pulmonary") return (
    // Cartoon inhaler, tilted: canister top-left, boot down to the mouthpiece on the right.
    <svg className={cls} viewBox="0 0 24 24" aria-hidden="true">
      <g transform="translate(12 12) rotate(-28) scale(.84) translate(-12.4 -10.6)">
        <g className="pz-inh__cloud">
          <circle className="pz-inh__puff pz-inh__puff--1" cx="19.4" cy="16.2" r="1.2" />
          <circle className="pz-inh__puff pz-inh__puff--2" cx="19.2" cy="14.6" r=".9" />
          <circle className="pz-inh__puff pz-inh__puff--3" cx="19.2" cy="17.8" r=".85" />
        </g>
        <g className="pz-inh__can">
          <rect className="pz-inh__label" x="7" y="3.8" width="5.4" height="5.6" rx=".6" />
          <rect className="pz-inh__cap" x="7" y="2.6" width="5.4" height="2" rx="1" />
          <path className="pz-inh__stripes" d="M8.2 6h3M8.2 7.6h3" />
        </g>
        <path className="pz-inh__boot" d="M6.4 8.4h6.6v5.2h0v5h-5a1.6 1.6 0 0 1-1.6-1.6z" />
        <rect className="pz-inh__side" x="11" y="8.4" width="2" height="10.2" />
        <path className="pz-inh__mouth" d="M13 13.6h4.6a.8.8 0 0 1 .8.8v3.4a.8.8 0 0 1-.8.8H13z" />
      </g>
    </svg>
  );

  if (route === "parenteral") return (
    // Syringe on the diagonal, needle to the top-right. Plunger pushes in, a few drops come out of the tip.
    <svg className={cls} viewBox="0 0 24 24" aria-hidden="true">
      <g transform="rotate(-45 12 12)">
        <g className="pz-syr__squirt">
          <circle className="pz-syr__drop pz-syr__drop--1" cx="21" cy="12" r=".8" />
          <circle className="pz-syr__drop pz-syr__drop--2" cx="21" cy="12" r=".65" />
          <circle className="pz-syr__drop pz-syr__drop--3" cx="21" cy="12" r=".6" />
        </g>
        <line className="pz-syr__needle" x1="17.8" y1="12" x2="20.6" y2="12" />
        <rect className="pz-syr__hub" x="15.8" y="10.8" width="2" height="2.4" rx=".5" />
        <rect className="pz-syr__flange" x="5.4" y="8.2" width="1" height="7.6" rx=".4" />
        <rect className="pz-syr__barrel" x="6.2" y="9.2" width="9.6" height="5.6" rx=".9" />
        <rect className="pz-syr__liquid" x="10" y="9.8" width="5.4" height="4.4" rx=".4" />
        <path className="pz-syr__marks" d="M11 9.2v1.3M12.5 9.2v.9M14 9.2v1.3" />
        <g className="pz-syr__plunger">
          <rect className="pz-syr__rod" x="3.4" y="11.3" width="5.6" height="1.4" rx=".4" />
          <rect className="pz-syr__thumb" x="2.6" y="8.8" width="1.2" height="6.4" rx=".5" />
          <rect className="pz-syr__stopper" x="8.6" y="9.7" width="1.4" height="4.6" rx=".4" />
        </g>
      </g>
    </svg>
  );

  return (
    // Cream tube on the same diagonal as the syringe, nozzle to the top-right. It squeezes and a dollop comes out.
    <svg className={cls} viewBox="0 0 24 24" aria-hidden="true">
      <g transform="rotate(-45 12 12) translate(-.3 0)">
        <g className="pz-cream__tube">
          <path className="pz-cream__crimp" d="M3 8.6h2.2v6.8H3l.6-1.1-.6-1.1.6-1.1-.6-1.1.6-1.1z" />
          <path className="pz-cream__body" d="M5 8.4h9.4l2.2 2.4v2.4l-2.2 2.4H5z" />
          <rect className="pz-cream__band" x="7.2" y="8.4" width="1.4" height="7.2" />
        </g>
        <rect className="pz-cream__nozzle" x="16.6" y="11" width="1.8" height="2" rx=".4" />
        <g className="pz-cream__dollop">
          <ellipse className="pz-cream__swirl" cx="20.1" cy="12" rx="1.7" ry="1.5" />
          <ellipse className="pz-cream__swirl" cx="20.6" cy="11.7" rx="1" ry=".9" />
        </g>
      </g>
    </svg>
  );
}
