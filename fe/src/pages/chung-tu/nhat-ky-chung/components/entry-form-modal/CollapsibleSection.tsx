import { useRef, useState, useEffect } from "react";
import { Divider } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  required?: boolean;
  scrollOnOpen?: boolean;
}

export function CollapsibleSection({ 
  title, 
  children, 
  defaultOpen = true,
  required = false,
  scrollOnOpen = false,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [height, setHeight] = useState<number | undefined>(defaultOpen ? undefined : 0);
  const contentRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const contentHeight = contentRef.current?.scrollHeight;
      setHeight(contentHeight);
      
      const timer = setTimeout(() => {
        setHeight(undefined);
        // Scroll after expand complete
        if (scrollOnOpen && dividerRef.current) {
          const modalBody = dividerRef.current.closest('.ant-modal-body');
          if (modalBody) {
            modalBody.scrollTo({
              top: modalBody.scrollHeight,
              behavior: 'smooth'
            });
          }
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      const contentHeight = contentRef.current?.scrollHeight;
      setHeight(contentHeight);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setHeight(0);
        });
      });
    }
  }, [isOpen, scrollOnOpen]);

  return (
    <>
      <div ref={dividerRef}>
        <Divider 
          className="my-2 cursor-pointer select-none" 
          style={{ margin: "8px 0" }}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="text-gray-600 hover:text-primary transition-colors flex items-center gap-1">
            {title}
            {required && <ExclamationCircleOutlined className="text-red-500 text-xs" />}
          </span>
        </Divider>
      </div>
      <div
        ref={contentRef}
        style={{
          height: height === undefined ? "auto" : height,
          overflow: "hidden",
          transition: "height 0.3s ease-out, opacity 0.3s ease-out",
          opacity: isOpen ? 1 : 0,
        }}
      >
        {children}
      </div>
    </>
  );
}
