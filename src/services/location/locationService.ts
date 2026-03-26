import { UserLocationData } from "../../types/user";
import { useState, useEffect } from "react";
import * as Device from 'expo-device';
import * as Location from 'expo-location';


export const getUserLocation = () =>{
  const [data, setData] = useState<UserLocationData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function gatherData(){
      try {
        }
      }
    }
  })
}




