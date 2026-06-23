import { useRouter } from "expo-router";
import * as React from "react";

import { useEffect } from "react";
import HomeScreen from "~/components/staff/Home";
import { getItem } from "~/lib/utils";
export default function Screen() {
    const router = useRouter();
    useEffect(() => {
        getItem("user").then((user) => {
            if (user) return;
            router.replace("/Signin");
        });
    }, [router]);

    return (
        <>
            <HomeScreen />
        </>
    );
}
