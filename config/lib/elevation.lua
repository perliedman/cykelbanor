local math = math

module "Elevation"

function slope_speed(way_info, base_speed, forward)
    local distance
    local climb_distance
    local desc_distance
    local climb_factor
    local desc_factor

    distance = way_info["distance"]

    if forward then
        climb_distance = way_info["climbDistance"]
        desc_distance = way_info["descentDistance"]
        climb = way_info["climb"]
        descent = way_info["descent"]
    else
        desc_distance = way_info["climbDistance"]
        climb_distance = way_info["descentDistance"]
        desc_factor = desc_distance / distance
        climb_factor = climb_distance / distance
        descent = way_info["climb"]
        climb = way_info["descent"]
    end

    climb_factor = climb_distance / distance
    desc_factor = desc_distance / distance

    local remain_factor = 1 - (climb_factor + desc_factor)
    local climb_gradient = climb_distance > 0 and climb / climb_distance / 1000 or 0
    local desc_gradient = desc_distance > 0 and -descent / desc_distance / 1000 or 0
    local climb_speed = speed(climb_gradient, base_speed)
    local desc_speed = speed(desc_gradient, base_speed)

    return base_speed * remain_factor + climb_speed * climb_factor + desc_speed * desc_factor
end

function speed(g, base_speed)
   if g>0 then
      return math.max(math.min(base_speed, 3),base_speed-100*g)
   else
      return math.min(math.max(base_speed, 50),base_speed-50*g)
   end
end
