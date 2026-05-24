import { BiUser } from "react-icons/bi";
import { useRouter } from "next/router";
import { RiNotificationLine } from "react-icons/ri";

import React from "react";
import useAuth from "@/hooks/useAuth";

const HeaderAuthen: React.FC = () => {
  const router = useRouter();
  const auth = useAuth();

  const handleLogin = () => {
    router.push("/login");
  };
  const openNotification = () => {};

  return (
    <div className="flex gap-7">
      <button onClick={handleLogin}>
        {auth?.isLogin ? (
          <img className="w-[24px] rounded-full" src={auth?.user?.avatar} />
        ) : (
          <BiUser size="24" />
        )}
      </button>
      <button onClick={openNotification}>
        <RiNotificationLine size="24" />
      </button>
    </div>
  );
};

export default HeaderAuthen;
