"use client";

import { useEffect } from "react";

type ContactModalProps = {
  onClose: () => void;
};

export default function ContactModal({ onClose }: ContactModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="contact-modal"
      role="dialog"
      aria-modal="true"
      aria-label="联系二维码"
      onClick={onClose}
    >
      <div className="contact-modal-card" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className="contact-modal-close"
          onClick={onClose}
          aria-label="关闭二维码"
        >
          ×
        </button>
        <img src="/contact-qr.jpg" alt="联系二维码" />
        <p>扫码联系 ROPGOD</p>
      </div>
    </div>
  );
}
