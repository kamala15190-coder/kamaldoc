export default function DeviceFrame({ children }) {
  return (
    <div className="device-frame">
      <div className="device-notch" />
      {children}
      <div className="device-glow" />
    </div>
  );
}
